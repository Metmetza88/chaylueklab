import { expect, it } from "vitest";
import { ZipArchive } from "archiver";
import { inspectRelease } from "@/lib/zip";
async function zip(files: Record<string, string>) {
  const a = new ZipArchive({ zlib: { level: 1 } });
  const chunks: Buffer[] = [];
  a.on("data", (c: Buffer) => chunks.push(c));
  const done = new Promise<Buffer>((resolve, reject) => {
    a.on("end", () => resolve(Buffer.concat(chunks)));
    a.on("error", reject);
  });
  for (const [name, body] of Object.entries(files)) a.append(body, { name });
  await a.finalize();
  return done;
}
const source = {
  "release/README.md": "manual",
  "release/DEPLOY-TH.md": "deploy",
  "release/LICENSE.md": "license",
  "release/CHANGELOG.md": "changelog",
  "release/package.json": "{}",
  "release/supabase/schema.sql": "-- schema",
  "release/tests/security.test.ts": "// test",
  "release/app/page.tsx": "// source",
};
it("accepts a complete source release archive", async () =>
  expect((await inspectRelease(await zip(source))).length).toBe(8));
it("rejects ZIPs containing secret environment files", async () => {
  await expect(
    inspectRelease(
      await zip({ ...source, "release/.env": "DO_NOT_PACKAGE=secret" }),
    ),
  ).rejects.toThrow("UNSAFE_ZIP");
});
it.each([
  "release/.env.local",
  "release/.ENV.production",
  "release/tests/local/auth.env",
  "release/.git/config",
  "release/.vercel/project.json",
])("rejects bundled credentials or deployment state: %s", async (name) => {
  await expect(
    inspectRelease(await zip({ ...source, [name]: "fixture" })),
  ).rejects.toThrow("UNSAFE_ZIP");
});
it("permits an environment template required for installation", async () => {
  expect(
    await inspectRelease(
      await zip({
        ...source,
        "release/.env.example": "SUPABASE_URL=your-project",
      }),
    ),
  ).toContain("release/.env.example");
});
it("rejects incomplete deliverables", async () => {
  await expect(
    inspectRelease(await zip({ "README.md": "only manual" })),
  ).rejects.toThrow("MISSING_DELIVERABLES");
});
it("rejects data that is not a ZIP", async () => {
  await expect(
    inspectRelease(Buffer.from("<html>not a zip</html>")),
  ).rejects.toThrow();
});
