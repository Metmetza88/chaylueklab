import { ZipArchive } from "archiver";
import {
  createWriteStream,
  existsSync,
  readdirSync,
  statSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
} from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
const version = JSON.parse(readFileSync("package.json", "utf8")).version;
const included = [
  "app",
  "components",
  "lib",
  "public",
  "types",
  "supabase",
  "scripts",
  "tests",
];
const configs = [
  "package.json",
  "package-lock.json",
  "tsconfig.json",
  "next.config.ts",
  "vercel.json",
  "middleware.ts",
  "eslint.config.mjs",
  "vitest.config.ts",
  "playwright.config.ts",
  "next-env.d.ts",
  ".gitignore",
];
function files(dir) {
  return readdirSync(dir).flatMap((n) => {
    const p = path.join(dir, n);
    if (
      [".temp", ".branches", ".env.local", ".accounts.json"].includes(n) ||
      n.endsWith(".env") ||
      n.startsWith(".env")
    )
      return [];
    return statSync(p).isDirectory() ? files(p) : [p];
  });
}
mkdirSync("dist", { recursive: true });
const manifests = [];
for (const slug of ["met-school-pro", "met-admission"]) {
  const base = `${slug}-v${version}`;
  const target = `dist/${base}.zip`;
  const output = createWriteStream(target);
  const archive = new ZipArchive({ zlib: { level: 9 } });
  archive.pipe(output);
  const done = new Promise((resolve, reject) => {
    output.on("close", resolve);
    archive.on("error", reject);
  });
  for (const dir of included)
    for (const f of files(dir)) {
      if (f.startsWith("supabase/.")) continue;
      archive.file(f, { name: `${base}/${f}` });
    }
  for (const f of configs)
    if (existsSync(f)) archive.file(f, { name: `${base}/${f}` });
  for (const [source, dest] of [
    ["README.md", "README.md"],
    ["DEPLOY-TH.md", "DEPLOY-TH.md"],
    ["docs/LICENSE.md", "LICENSE.md"],
    ["CHANGELOG.md", "CHANGELOG.md"],
    ["docs/SCHOOL-USER-GUIDE-TH.md", "USER-GUIDE-TH.md"],
    ["docs/SECURITY.md", "SECURITY.md"],
  ])
    if (dest === "README.md")
      archive.append(
        readFileSync(source, "utf8").replace(
          "../../PROJECT-STATUS.md",
          "PROJECT-STATUS.md",
        ),
        { name: `${base}/${dest}` },
      );
    else archive.file(source, { name: `${base}/${dest}` });
  for (const f of [
    "docs/SCHOOL-USER-GUIDE-TH.md",
    "docs/IPHONE-ADMIN-TH.md",
    "docs/SECURITY.md",
    "docs/MONTHLY-COSTS.md",
    "docs/TEST-REPORT.md",
    "docs/INTEGRATIONS.md",
    "docs/OWNER-ACTIONS.md",
    "docs/CI-DEPLOY-TH.md",
    "docs/CI-RESULTS-20261126.json",
    "docs/PDF-VALIDATION-20261126.json",
    "docs/LICENSE.md",
    "docs/E2E-RESULTS.json",
    "docs/INTEGRATION-RESULTS.json",
    "docs/DEPENDENCY-AUDIT.json",
  ])
    archive.file(f, { name: `${base}/${f}` });
  archive.append(
    `# ${slug} — ${version}\n\nRelease Candidate; ready_for_sale=false.\n\nSource/database/manuals/tests/screenshots included. Local validation: Unit53, integration23, Playwright80passed/12plannedskips/0failed. Supabase Storage service, authorized payment provider, SMTP, physical devices and owner acceptance remain pending.\n\nSee docs/TEST-REPORT.md, docs/SECURITY.md, docs/OWNER-ACTIONS.md and release.json.\n\nRepository: https://github.com/Metmetza88/chaylueklab/tree/feature/woramet-school-store-20261124 (public).\n`,
    { name: `${base}/PROJECT-STATUS.md` },
  );
  archive.append(
    readFileSync(".env.example", "utf8").replace(
      "APP_VARIANT=store",
      "APP_VARIANT=school",
    ),
    { name: `${base}/.env.example` },
  );
  const manifest = {
    product: slug,
    version,
    status: "release_candidate",
    ready_for_sale: false,
    requires: [
      "Supabase Storage upload/download E2E",
      "authorized payment provider Sandbox verification",
      "school data/privacy owner approval",
      "physical iPhone/Android acceptance",
    ],
    license: "single-school",
  };
  archive.append(JSON.stringify(manifest, null, 2), {
    name: `${base}/release.json`,
  });
  await archive.finalize();
  await done;
  const bytes = readFileSync(target);
  manifests.push({
    ...manifest,
    file: path.basename(target),
    bytes: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  });
}
writeFileSync("dist/manifest.json", JSON.stringify(manifests, null, 2) + "\n");
process.stdout.write(
  JSON.stringify(
    manifests.map(({ product, file, bytes, sha256 }) => ({
      product,
      file,
      bytes,
      sha256,
    })),
    null,
    2,
  ) + "\n",
);
