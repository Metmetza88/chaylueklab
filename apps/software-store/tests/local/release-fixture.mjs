import { ZipArchive } from "archiver";
// Synthetic bytes for upload/download tests, never a sale release.
/** @returns {Promise<Buffer>} */
export async function fixtureZip(extra = {}) {
  const label = "SYNTHETIC STORAGE TEST FIXTURE. NOT SOFTWARE FOR SALE.";
  const files = {
    "fixture/README.md": label,
    "fixture/DEPLOY-TH.md": label,
    "fixture/LICENSE.md": label,
    "fixture/CHANGELOG.md": label,
    "fixture/package.json": JSON.stringify({
      name: "storage-fixture",
      version: "0.0.0-test",
      private: true,
    }),
    "fixture/supabase/schema.sql": `-- ${label}`,
    "fixture/tests/fixture.test.ts": `// ${label}`,
    "fixture/app/page.tsx": `// ${label}`,
    ...extra,
  };
  const archive = new ZipArchive({ zlib: { level: 1 } });
  const chunks = [];
  archive.on("data", (chunk) => chunks.push(chunk));
  const done = new Promise((resolve, reject) => {
    archive.on("end", () => resolve(Buffer.concat(chunks)));
    archive.on("error", reject);
  });
  for (const [name, body] of Object.entries(files))
    archive.append(body, { name });
  await archive.finalize();
  return done;
}
