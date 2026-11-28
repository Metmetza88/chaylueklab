import { chromium } from "@playwright/test";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import sharp from "sharp";

const base = new URL(
  process.env.DEMO_CAPTURE_BASE_URL || "https://store.chaylueklab.com",
);
if (
  !["https:", "http:"].includes(base.protocol) ||
  base.username ||
  base.password
)
  throw new Error(
    "Use an HTTP origin without credentials for synthetic demos.",
  );
const output = "public/screenshots/demos";
mkdirSync(output, { recursive: true });
const browser = await chromium.launch({
  executablePath:
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || "/usr/bin/chromium",
  args: ["--no-sandbox"],
  ...(process.env.PLAYWRIGHT_PROXY_SERVER
    ? { proxy: { server: process.env.PLAYWRIGHT_PROXY_SERVER } }
    : {}),
});
const captures = [];
try {
  for (const slug of ["met-school-pro", "met-admission", "met-attendance"]) {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1600 },
      deviceScaleFactor: 1,
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    const posts = [];
    page.on("request", (request) => {
      if (request.method() === "POST")
        posts.push(new URL(request.url()).pathname);
    });
    const url = new URL(`/demo/${slug}`, base).href;
    const response = await page.goto(url, { waitUntil: "networkidle" });
    if (response?.status() !== 200)
      throw new Error(`Demo unavailable: ${slug}`);
    await page
      .getByText(/ข้อมูลสมมติ/)
      .first()
      .waitFor();
    await page.evaluate(() => document.fonts.ready);
    await page.waitForFunction(
      () => document.documentElement.dataset.storeTheme === "midnight",
    );
    if (slug === "met-admission") {
      await page
        .getByRole("button", { name: "สมัครเรียน", exact: true })
        .click();
      await page
        .getByRole("heading", { name: "สมัครเรียนออนไลน์", exact: true })
        .waitFor();
    }
    const target =
      slug === "met-attendance"
        ? page.locator("#main > section").first()
        : page.locator(".workspace");
    const box = await target.boundingBox();
    if (!box || box.width < 500)
      throw new Error(`Missing actual workspace: ${slug}`);
    const file = `${output}/${slug}.png`;
    await page.screenshot({
      path: file,
      animations: "disabled",
      clip: {
        x: box.x,
        y: box.y,
        width: box.width,
        height: Math.min(800, box.height),
      },
    });
    if (posts.length)
      throw new Error("Capture must not submit data to a server.");
    const metadata = await sharp(file).metadata();
    captures.push({
      slug,
      source_url: url,
      source_commit: process.env.DEMO_CAPTURE_SOURCE_COMMIT || null,
      source_deployment_id: process.env.DEMO_CAPTURE_DEPLOYMENT_ID || null,
      view:
        slug === "met-school-pro"
          ? "School website and news"
          : slug === "met-admission"
            ? "Admission form"
            : "Attendance filters, counts and roster",
      file: file.replace(/^public/, ""),
      width: metadata.width,
      height: metadata.height,
      sha256: createHash("sha256").update(readFileSync(file)).digest("hex"),
      synthetic_data_only: true,
      server_post_requests: posts.length,
      method:
        "Unedited Chromium screenshot of the actual rendered demo interface",
    });
    await context.close();
  }
} finally {
  await browser.close();
}
writeFileSync(
  "docs/DEMO-PREVIEW-CAPTURES-20261127.json",
  JSON.stringify(
    {
      checked_at: new Date().toISOString(),
      viewport: { width: 1440, height: 1600 },
      captures,
      scope:
        "Public synthetic demo interfaces. No customer accounts, real student data, submitted applications or payments.",
    },
    null,
    2,
  ) + "\n",
);
process.stdout.write(
  JSON.stringify(
    captures.map(({ slug, width, height, sha256 }) => ({
      slug,
      width,
      height,
      sha256,
    })),
    null,
    2,
  ) + "\n",
);
