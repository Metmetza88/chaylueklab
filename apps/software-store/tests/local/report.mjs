import { readFileSync, writeFileSync, rmSync, existsSync } from "node:fs";
const files = [
  "docs/INTEGRATION-RESULTS.json",
  "docs/STORAGE-RESULTS.json",
  "docs/E2E-RESULTS.json",
];
const commit = process.env.GITHUB_SHA ?? null;
if (process.argv[2] === "prepare") {
  for (const path of [...files, "test-results/results.json"])
    rmSync(path, { force: true });
} else if (process.argv[2] === "finalize") {
  const cases = [];
  let frameworkErrors = 0;
  function visit(suite) {
    for (const spec of suite.specs ?? [])
      for (const test of spec.tests ?? []) {
        const result = test.results?.at(-1);
        cases.push({
          title: String(spec.title).slice(0, 250),
          project: test.projectName,
          status: result?.status ?? "not_run",
          duration_ms: result?.duration ?? 0,
        });
      }
    for (const child of suite.suites ?? []) visit(child);
  }
  if (existsSync("test-results/results.json")) {
    const result = JSON.parse(
      readFileSync("test-results/results.json", "utf8"),
    );
    frameworkErrors = result.errors?.length ?? 0;
    for (const suite of result.suites ?? []) visit(suite);
  }
  const failed = cases.filter(
    (c) => !["passed", "skipped"].includes(c.status),
  ).length;
  writeFileSync(
    files[2],
    JSON.stringify(
      {
        checked_at: new Date().toISOString(),
        source_commit: commit,
        environment:
          "Next.js production build, Chromium desktop/iPhone/Android/tablet viewports; synthetic local test accounts",
        status:
          failed || frameworkErrors
            ? "failed"
            : cases.length
              ? "completed"
              : "not_run",
        passed: cases.filter((c) => c.status === "passed").length,
        skipped: cases.filter((c) => c.status === "skipped").length,
        failed,
        framework_errors: frameworkErrors,
        physical_devices_tested: false,
        storage_api_requested: process.env.TEST_STORAGE_API === "true",
        cases,
      },
      null,
      2,
    ) + "\n",
  );
  for (const path of files.slice(0, 2)) {
    const result = existsSync(path)
      ? JSON.parse(readFileSync(path, "utf8"))
      : null;
    if (!result || result.source_commit !== commit)
      writeFileSync(
        path,
        JSON.stringify(
          {
            checked_at: new Date().toISOString(),
            source_commit: commit,
            status: "not_run",
            passed: 0,
            tests: [],
          },
          null,
          2,
        ) + "\n",
      );
  }
  process.stdout.write(
    "Prepared sanitized test evidence; credentials, signed URLs and raw browser state are excluded.\n",
  );
} else throw Error("Use prepare or finalize");
