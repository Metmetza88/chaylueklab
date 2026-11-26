/** Real local HTTP/browser regression. Install playwright separately (see README). */
import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
function safeMessage(error) {
  let message = error instanceof Error ? error.message : String(error);
  if (process.env.VERCEL_OIDC_TOKEN) {
    message = message.split(process.env.VERCEL_OIDC_TOKEN).join("[REDACTED]");
  }
  return message.replace(
    /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,
    "[REDACTED JWT]",
  );
}
// Network-library errors may include request headers; never print raw errors.
for (const event of ["unhandledRejection", "uncaughtException"]) {
  process.on(event, (error) => {
    console.error(safeMessage(error));
    process.exit(1);
  });
}
const { chromium, webkit, devices } = await import(
  process.env.PLAYWRIGHT_MODULE
    ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href
    : "playwright"
);
const base = process.env.EMBROIDERY_URL || "http://127.0.0.1:4175";
const output = resolve(
  process.env.EMBROIDERY_REPORT_DIR || "embroidery/reports",
);
const targetOrigin = new URL(base).origin;
await mkdir(output, { recursive: true });
const reports = [];
const tests = [
  ["chromium-desktop", chromium, { viewport: { width: 1440, height: 1000 } }],
  [
    "chromium-iphone",
    chromium,
    { ...devices["iPhone 13"], defaultBrowserType: undefined },
  ],
  [
    "webkit-iphone",
    webkit,
    { ...devices["iPhone 13"], defaultBrowserType: undefined },
  ],
];
async function test(label, type, options) {
  const browser = await type.launch(
    type === chromium && process.env.CHROMIUM_PATH
      ? { executablePath: process.env.CHROMIUM_PATH, args: ["--no-sandbox"] }
      : { headless: true },
  );
  const context = await browser.newContext({
      ...options,
      acceptDownloads: true,
      proxy: process.env.EMBROIDERY_PROXY
        ? { server: process.env.EMBROIDERY_PROXY }
        : undefined,
    }),
    page = await context.newPage(),
    errors = [];
  if (process.env.VERCEL_OIDC_TOKEN) {
    // Keep the short-lived credential on the deployment origin only.
    // Never send it to Google Fonts or other third-party resources.
    await context.route("**/*", async (route) => {
      const headers = { ...route.request().headers() };
      const requestUrl = new URL(route.request().url());
      if (
        ["http:", "https:"].includes(requestUrl.protocol) &&
        requestUrl.origin === targetOrigin
      ) {
        headers["x-vercel-trusted-oidc-idp-token"] =
          process.env.VERCEL_OIDC_TOKEN;
        // A redirect becomes a fresh browser request with its own origin check.
        // Never let the authenticated network fetch follow it itself.
        const response = await route.fetch({ headers, maxRedirects: 0 });
        return route.fulfill({ response });
      } else {
        delete headers["x-vercel-trusted-oidc-idp-token"];
      }
      return route.continue({ headers });
    });
  }
  page.on("pageerror", (e) => errors.push(safeMessage(e)));
  const mobile = label.includes("iphone");
  async function properties() {
    if (mobile && !(await page.locator("#properties").isVisible()))
      await page.locator("#toggle-properties").click();
  }
  async function closeProperties() {
    if (mobile && (await page.locator("#properties").isVisible()))
      await page.locator("#toggle-properties").click();
  }
  async function tool(id) {
    if (mobile && !(await page.locator("#toolbox").isVisible()))
      await page.locator("#toggle-tools").click();
    await page.locator(`[data-tool="${id}"]`).click();
  }
  async function waitCompiled() {
    await page.waitForFunction(
      () =>
        document
          .getElementById("status")
          .textContent.includes("ตรวจ DST แล้ว") ||
        document.getElementById("status").textContent.includes("นำเข้าแบบแล้ว"),
    );
  }
  async function download(action) {
    const promise = page.waitForEvent("download");
    await page.locator(`[data-action="${action}"]:visible`).first().click();
    const file = await promise;
    await file.saveAs(resolve(output, `${label}-${file.suggestedFilename()}`));
    return resolve(output, `${label}-${file.suggestedFilename()}`);
  }
  try {
    await page.goto(`${base}/embroidery-studio.html`);
    await page.waitForFunction(
      () => document.getElementById("stitch-count").textContent !== "—",
    );
    assert.equal(
      await page.evaluate(() => document.body.scrollWidth <= innerWidth),
      true,
    );
    await page.waitForFunction(() =>
      document
        .getElementById("api-status")
        .textContent.includes("Engine พร้อม"),
    );
    if (process.env.EMBROIDERY_EXPECTED_COMMIT) {
      const release = await page.evaluate(async () =>
        (await fetch("./release.json")).json(),
      );
      assert.equal(release.commit, process.env.EMBROIDERY_EXPECTED_COMMIT);
    }
    await page.screenshot({
      path: resolve(output, `${label}.png`),
      fullPage: true,
    });
    // Local save + browser reload: source/design in IndexedDB, never a fake cloud save.
    await page.locator('[data-action="save"]').first().click();
    await page.waitForFunction(() =>
      document
        .getElementById("status")
        .textContent.includes("บันทึกแบบในเครื่อง"),
    );
    await page.reload();
    await page.waitForFunction(
      () => document.getElementById("stitch-count").textContent !== "—",
    );
    await page
      .locator("summary")
      .filter({ hasText: /^File$/ })
      .click();
    await page.locator('[data-action="history"]').first().click();
    await page
      .locator("#modal .history-card button")
      .filter({ hasText: "เปิดแบบ" })
      .first()
      .click();
    await waitCompiled();
    // Edit color, offset, sequence, undo/redo and check backend compiles the changed geometry.
    await properties();
    const selected = await page.locator("#object-select").inputValue();
    await page.locator("#object-color").fill("#2244aa");
    await page.locator("#object-color").dispatchEvent("change");
    await waitCompiled();
    assert.equal(await page.locator("#object-select").inputValue(), selected);
    await page.locator("#object-x").fill("2");
    await page.locator("#object-x").dispatchEvent("change");
    await waitCompiled();
    await page.locator('[data-action="move-down"]').click();
    await waitCompiled();
    await closeProperties();
    await page.locator('.command-actions [data-action="undo"]').click();
    await waitCompiled();
    await page.locator('.command-actions [data-action="redo"]').click();
    await waitCompiled();
    // Running + real satin centerline + tatami polygon.
    const rect = await page.locator("#stage").boundingBox();
    const tapCanvas = (x, y) =>
      mobile ? page.touchscreen.tap(x, y) : page.mouse.click(x, y);
    for (const id of ["running", "satin", "tatami"]) {
      await tool(id);
      await tapCanvas(rect.x + rect.width * 0.38, rect.y + rect.height * 0.4);
      await tapCanvas(rect.x + rect.width * 0.58, rect.y + rect.height * 0.4);
      if (id === "tatami")
        await tapCanvas(rect.x + rect.width * 0.48, rect.y + rect.height * 0.6);
      await page.locator('#drawing-bar [data-action="finish-path"]').click();
      await waitCompiled();
    }
    // Reshape manual polygon point then move its object with the pointer.
    await tool("reshape");
    await page.mouse.move(
      rect.x + rect.width * 0.38,
      rect.y + rect.height * 0.4,
    );
    await page.mouse.down();
    await page.mouse.move(
      rect.x + rect.width * 0.39,
      rect.y + rect.height * 0.42,
    );
    await page.mouse.up();
    await waitCompiled();
    await tool("select");
    await page.mouse.move(
      rect.x + rect.width * 0.48,
      rect.y + rect.height * 0.45,
    );
    await page.mouse.down();
    await page.mouse.move(
      rect.x + rect.width * 0.49,
      rect.y + rect.height * 0.46,
    );
    await page.mouse.up();
    await waitCompiled();
    // Preview progress truly changes, then export DST and read in Python in the companion step.
    await page.locator("#simulation").fill("0");
    await page.locator("#simulation").dispatchEvent("input");
    await page.locator("#play").click();
    await page.waitForFunction(
      () => Number(document.getElementById("simulation").value) > 0,
    );
    await page.locator("#play").click();
    const dst = await download("export-dst");
    assert.equal((await readFile(dst)).subarray(0, 3).toString(), "LA:");
    // Exercise the additional real export formats through the UI.
    for (const fmt of ["svg", "png", "pes", "jef"]) {
      await page
        .locator("summary")
        .filter({ hasText: /^Export$/ })
        .click();
      const path = await download(`export-${fmt}`);
      const data = await readFile(path);
      if (fmt === "svg") assert.ok(data.toString().includes("<polyline"));
      if (fmt === "png")
        assert.equal(data.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
      if (fmt === "pes") assert.equal(data.subarray(0, 4).toString(), "#PES");
    }
    // Upload -> digitize from PNG, verify requested dimension and populated preview.
    await properties();
    await page
      .locator("#upload")
      .setInputFiles("embroidery/samples/synthetic-crest.png");
    await page.waitForFunction(() =>
      document.getElementById("status").textContent.includes("ภาพพร้อมแล้ว"),
    );
    await page.locator("#width").fill("50");
    await page.locator("#colors").selectOption("3");
    await page.locator("#digitize").click();
    await page.waitForFunction(() =>
      document
        .getElementById("status")
        .textContent.includes("สร้างฝีเข็มรุ่นทดลองแล้ว"),
    );
    assert.notEqual(await page.locator("#stitch-count").textContent(), "—");
    // Customer local request + owner status change + importing a request JSON.
    await page.locator("#mode").selectOption("customer");
    await properties();
    await page.locator("#customer-name").fill("ทดสอบลูกค้า");
    await page.locator("#customer-note").fill("ทดสอบ 50 มม. ไม่ใช่งานผลิต");
    const reqPath = await download("customer-request");
    const record = JSON.parse(await readFile(reqPath));
    assert.equal(record.status, "draft");
    assert.equal(record.customer, "ทดสอบลูกค้า");
    await page.locator("#mode").selectOption("owner");
    await page.locator('[data-action="history"]').last().click();
    await page
      .locator("#modal .history-card select")
      .first()
      .selectOption("in_review");
    await page.waitForFunction(() =>
      document
        .getElementById("status")
        .textContent.includes("เปลี่ยนสถานะในเครื่อง"),
    );
    await page.locator('[data-action="close-modal"]').click();
    await closeProperties();
    await page.locator("#project-file").setInputFiles(reqPath);
    await waitCompiled();
    assert.equal(
      await page.locator("#customer-name").inputValue(),
      "ทดสอบลูกค้า",
    );
    // Start a design without an image, then confirm offline mode never fakes export.
    await page
      .locator("summary")
      .filter({ hasText: /^File$/ })
      .click();
    await page.locator('[data-action="new"]:visible').click();
    await tool("running");
    await tapCanvas(rect.x + rect.width * 0.42, rect.y + rect.height * 0.45);
    await tapCanvas(rect.x + rect.width * 0.55, rect.y + rect.height * 0.5);
    await page.locator('#drawing-bar [data-action="finish-path"]').click();
    await waitCompiled();
    assert.notEqual(await page.locator("#stitch-count").textContent(), "—");
    await page.route("**/api/embroidery", (route) =>
      route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ error: "API ไม่พร้อม" }),
      }),
    );
    await page.reload();
    await page.waitForFunction(() =>
      document.getElementById("status").textContent.includes("API ยังไม่พร้อม"),
    );
    assert.notEqual(await page.locator("#stitch-count").textContent(), "—");
    let offlineDownload = false;
    page.on("download", () => (offlineDownload = true));
    await page.locator('.command-actions [data-action="export-dst"]').click();
    await page.waitForFunction(
      () => document.getElementById("status").textContent === "API ไม่พร้อม",
    );
    assert.equal(offlineDownload, false);
    assert.deepEqual(errors, []);
    reports.push({
      browser: label,
      target_url: base,
      expected_commit: process.env.EMBROIDERY_EXPECTED_COMMIT || null,
      status: "passed",
      viewport: await page.evaluate(() => ({
        width: innerWidth,
        height: innerHeight,
      })),
      checks: [
        "no horizontal overflow",
        "sample",
        "IndexedDB save/reopen",
        "color/offset/order",
        "undo/redo",
        "running",
        "satin",
        "tatami",
        "reshape",
        "drag",
        "simulation",
        "binary DST download",
        "PES/JEF/SVG/PNG download",
        mobile ? "emulated touch points on iPhone" : "mouse point entry",
        "upload/auto digitize",
        "customer local draft",
        "owner local status",
        "JSON import",
        "new design without image",
        "offline sample with explicit unavailable API and no fake export",
      ],
      javascript_errors: errors,
    });
  } catch (error) {
    await page.screenshot({
      path: resolve(output, `${label}-failure.png`),
      fullPage: true,
    });
    console.error(label, await page.locator("#status").textContent(), errors);
    throw new Error(safeMessage(error));
  } finally {
    await browser.close();
  }
}
for (const [label, type, options] of tests.filter(
  ([label]) =>
    !process.env.EMBROIDERY_BROWSERS ||
    process.env.EMBROIDERY_BROWSERS.split(",").includes(label),
)) {
  await test(label, type, options);
  console.log(`PASS ${label}`);
  await writeFile(
    resolve(output, "browser-results.json"),
    JSON.stringify(
      {
        date: new Date().toISOString(),
        environment:
          "Linux; emulated iPhone; no physical Windows/iPhone/Tajima test",
        results: reports,
      },
      null,
      2,
    ),
  );
}
