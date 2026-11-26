import { ZipArchive } from "archiver";
import {
  createWriteStream,
  readdirSync,
  lstatSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
} from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
const version = JSON.parse(
  readFileSync(sourcePath("package.json"), "utf8"),
).version;
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
function sourcePath(file, { optional = false, directory = false } = {}) {
  const parts = file.split("/");
  let current = "";
  for (const [index, part] of parts.entries()) {
    current = path.join(current, part);
    const entry = lstatSync(current, { throwIfNoEntry: !optional });
    if (!entry) return undefined;
    const expectDirectory = index < parts.length - 1 || directory;
    if (!(expectDirectory ? entry.isDirectory() : entry.isFile()))
      throw new Error(`Invalid release source: ${current}`);
  }
  return file;
}
function files(dir) {
  sourcePath(dir, { directory: true });
  return readdirSync(dir).flatMap((n) => {
    const p = path.join(dir, n);
    if (
      [
        ".temp",
        ".branches",
        ".env.local",
        ".accounts.json",
        ".git",
        ".vercel",
        "node_modules",
        ".next",
        "test-results",
        "playwright-report",
      ].includes(n) ||
      n.endsWith(".env") ||
      n.startsWith(".env")
    )
      return [];
    const entry = lstatSync(p);
    if (!entry.isDirectory() && !entry.isFile())
      throw new Error(`Invalid release source: ${p}`);
    return entry.isDirectory() ? files(p) : [p];
  });
}
const releaseFiles = included
  .flatMap(files)
  .filter((file) => !file.startsWith("supabase/."));
const documents = [
  ["DEPLOY-TH.md", "DEPLOY-TH.md"],
  ["docs/LICENSE.md", "LICENSE.md"],
  ["CHANGELOG.md", "CHANGELOG.md"],
  ["docs/SCHOOL-USER-GUIDE-TH.md", "USER-GUIDE-TH.md"],
  ["docs/SECURITY.md", "SECURITY.md"],
].map(([source, dest]) => [sourcePath(source), dest]);
const optionalFiles = [
  ...configs,
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
  "docs/REAL-STORAGE-TESTS-TH.md",
  "docs/STORAGE-RESULTS.json",
  "docs/AUTHENTICATED-SCREENSHOTS-20261126.json",
  "docs/FORM-RETENTION-20261126.json",
  "docs/LICENSE.md",
  "docs/E2E-RESULTS.json",
  "docs/INTEGRATION-RESULTS.json",
  "docs/DEPENDENCY-AUDIT.json",
].filter((file) => sourcePath(file, { optional: true }));
const readme = readFileSync(sourcePath("README.md"), "utf8").replace(
  "../../PROJECT-STATUS.md",
  "PROJECT-STATUS.md",
);
const exampleEnv = readFileSync(sourcePath(".env.example"), "utf8").replace(
  "APP_VARIANT=store",
  "APP_VARIANT=school",
);

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
  for (const file of [...releaseFiles, ...optionalFiles])
    archive.file(file, { name: `${base}/${file}` });
  for (const [source, dest] of documents)
    archive.file(source, { name: `${base}/${dest}` });
  archive.append(readme, { name: `${base}/README.md` });
  archive.append(
    `# ${slug} — ${version}\n\nRelease Candidate; ready_for_sale=false.\n\nSource/database/manuals/tests/screenshots included. Actual test counts, environments, source commits and limits are recorded in docs/TEST-REPORT.md and the included JSON evidence. A test script or successful CI check does not mean that Vercel/hosted services are deployed or accepted.\n\nHosted Supabase/Storage CDN, authorized payment provider, SMTP, physical devices and owner acceptance remain pending. See docs/SECURITY.md, docs/OWNER-ACTIONS.md and release.json.\n\nRepository: https://github.com/Metmetza88/chaylueklab/tree/feature/woramet-school-store-20261124 (public).\n`,
    { name: `${base}/PROJECT-STATUS.md` },
  );
  archive.append(exampleEnv, { name: `${base}/.env.example` });
  const manifest = {
    product: slug,
    version,
    status: "release_candidate",
    ready_for_sale: false,
    requires: [
      "Hosted Supabase Storage/CDN and deployment E2E",
      "SMTP delivery and backup/restore verification",
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
