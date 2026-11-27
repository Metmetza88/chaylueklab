import { test, expect } from "@playwright/test";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import catalog from "../../lib/catalog.json";

const staticPages = [
  "/", "/products", "/categories", "/demo", "/cart", "/checkout",
  "/login", "/register", "/forgot-password", "/reset-password",
  "/membership", "/support", "/contact", "/guide", "/privacy", "/terms", "/school-systems",
];
const publicPages = [
  ...staticPages,
  ...catalog.map((product) => "/products/" + product.slug),
  "/demo/met-school-pro", "/demo/met-admission", "/demo/met-attendance",
];
const configured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const redirectedPages = [
  "/orders", "/downloads", "/admin", "/admin/orders", "/school-admin/not-a-real-school",
  ...(configured ? ["/schools/not-a-real-school/apply", "/schools/not-a-real-school/applications"] : []),
];
const absentPages = [
  "/products/not-a-real-product", "/demo/not-a-real-product", "/not-a-real-page",
  "/schools/not-a-real-school",
  ...(!configured ? ["/schools/not-a-real-school/apply", "/schools/not-a-real-school/applications"] : []),
];
const reportDir = "/workspace/library-files";
const screenDir = reportDir + "/store126-screens";
const sampleId = "11111111-1111-4111-8111-000000000001";

test("all public page templates and unconfigured access boundaries render without horizontal overflow", async ({ page }, info) => {
  test.setTimeout(360_000);
  const rows: Record<string, unknown>[] = [];
  const errors: { path: string; message: string }[] = [];
  const externalRequests: string[] = [];
  const baseURL = String(info.project.use.baseURL || process.env.BASE_URL || "http://127.0.0.1:3041");
  const allowedOrigin = new URL(baseURL).origin;
  expect(["127.0.0.1", "localhost"].includes(new URL(baseURL).hostname)).toBe(true);
  page.on("pageerror", (error) => errors.push({ path: new URL(page.url()).pathname, message: error.message.slice(0, 300) }));
  await page.route("**/*", async (route) => {
    const target = new URL(route.request().url());
    if (target.origin !== allowedOrigin && !["data:", "blob:"].includes(target.protocol)) {
      externalRequests.push(target.origin);
      await route.abort();
      return;
    }
    await route.continue();
  });
  mkdirSync(screenDir, { recursive: true });
  const device = info.project.name.replace(/[^a-zA-Z0-9]+/g, "-").replace(/-$/, "");
  try {
    for (const path of publicPages) {
      const response = await page.goto(path, { waitUntil: "networkidle" });
      const row: Record<string, unknown> = { path, status: response?.status(), expected: 200, mode: "public-render" };
      rows.push(row);
      expect(response?.status(), path).toBe(200);
      await expect(page.locator("main").first(), path).toBeVisible();
      await expect(page.locator("h1").first(), path).toBeVisible();
      const dimensions = await page.evaluate(() => ({
        viewport: innerWidth,
        content: document.documentElement.scrollWidth,
        bodyFontPx: parseFloat(getComputedStyle(document.body).fontSize),
        brokenImages: [...document.images].filter((image) => image.complete && image.naturalWidth === 0).map((image) => new URL(image.src).pathname),
      }));
      row.dimensions = dimensions;
      expect(dimensions.content, path).toBeLessThanOrEqual(dimensions.viewport + 2);
      expect(dimensions.bodyFontPx, "Readable body size at " + path).toBeGreaterThanOrEqual(16);
      expect(dimensions.brokenImages, path).toEqual([]);
      expect(await page.locator('a[href="#"]').count(), path).toBe(0);
      if (["/", "/products", "/demo/met-admission", "/demo/met-school-pro"].includes(path)) {
        const name = path === "/" ? "home" : path.slice(1).replaceAll("/", "-");
        await page.screenshot({ path: `${screenDir}/${device}-${name}.png`, fullPage: true, animations: "disabled" });
      }
      row.passed = true;
    }
    for (const path of redirectedPages) {
      const response = await page.goto(path, { waitUntil: "networkidle" });
      const target = new URL(page.url());
      const row = { path, status: response?.status(), target: target.pathname, mode: "anonymous-redirect", passed: target.pathname === "/login" };
      rows.push(row);
      expect(target.pathname, path).toBe("/login");
      await expect(page.locator('input[name="email"]'), path).toBeVisible();
    }
    for (const path of absentPages) {
      const response = await page.goto(path, { waitUntil: "networkidle" });
      rows.push({ path, status: response?.status(), expected: 404, mode: "absent-or-unconfigured", passed: response?.status() === 404 });
      expect(response?.status(), path).toBe(404);
      await expect(page.locator("h1").first(), path).toBeVisible();
    }
    expect(externalRequests, "No outside service is contacted by this local public audit").toEqual([]);
    expect(errors, "No browser runtime errors while navigating").toEqual([]);
  } finally {
    writeFileSync(`${reportDir}/store126-browser-${device}.json`, JSON.stringify({
      checkedAt: new Date().toISOString(),
      project: info.project.name,
      viewport: info.project.use.viewport,
      baseURL: allowedOrigin,
      scope: "Local public and anonymous boundaries only; no credentials, order mutations, uploads, bank requests, or hosted Supabase reads",
      sourceUnitHashes: Object.fromEntries(["app/globals.css", "app/premium.css", "components/DisplayControls.tsx"].map((file) => [file, createHash("sha256").update(readFileSync(file)).digest("hex")])),
      privateAuthenticatedWorkflows: "not part of this public-route testcase; see separate authenticated suite evidence",
      rows,
      browserErrors: errors,
      blockedExternalOrigins: [...new Set(externalRequests)],
    }, null, 2));
  }
});

test("anonymous private APIs deny data and report security headers without mutation", async ({ request }, info) => {
  test.skip(info.project.name !== "Desktop Chromium", "Authorization checks are identical across viewports");
  const paths = [
    [`/api/download/${sampleId}`, 401],
    ["/api/admin/report", 403],
    [`/api/admin/slips/${sampleId}`, 403],
    [`/api/orders/${sampleId}/receipt`, 401],
    [`/api/school/documents/${sampleId}`, 401],
    [`/api/school/applications/${sampleId}/pdf`, 401],
    ["/api/school/not-a-real-school/export", 403],
    ["/api/school/not-a-real-school/logo", 404],
  ] as const;
  const rows: { path: string; expected: number; status: number }[] = [];
  for (const [path, expected] of paths) {
    const response = await request.get(path, { maxRedirects: 0 });
    rows.push({ path, expected, status: response.status() });
    expect(response.status(), path).toBe(expected);
    expect(response.headers()["x-content-type-options"]).toBe("nosniff");
    expect(response.headers()["x-frame-options"]).toBe("DENY");
  }
  const health = await request.get("/api/health");
  expect(health.status()).toBe(200);
  const body = await health.json();
  expect(body.database_configured).toBe(configured);
  const mode = process.env.PAYMENT_MODE === "sandbox" ? "sandbox" : "disabled";
  expect(body.payment_mode).toBe(mode);
  expect(body.ready_for_live_payments).toBe(false);
  writeFileSync(`${reportDir}/store126-anonymous-api.json`, JSON.stringify({ checkedAt: new Date().toISOString(), rows, localOnly: true, health: body }, null, 2));
});
