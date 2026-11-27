import { readFile } from "node:fs/promises";
import { test, expect } from "@playwright/test";
const pages = [
  "/",
  "/products",
  "/categories",
  "/demo",
  "/demo/met-school-pro",
  "/demo/met-admission",
  "/demo/met-attendance",
  "/cart",
  "/checkout",
  "/login",
  "/register",
  "/membership",
  "/support",
  "/contact",
  "/guide",
  "/school-systems",
  "/privacy",
  "/terms",
];
for (const path of pages)
  test(`public page ${path} renders and fits the viewport`, async ({
    page,
  }) => {
    const response = await page.goto(path);
    expect(response?.status(), path).toBe(200);
    await expect(page.locator("main").first()).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 2,
    );
    expect(overflow, `horizontal overflow at ${path}`).toBe(false);
    expect(
      await page.locator('a[href="#"],button:not([type]):empty').count(),
    ).toBe(0);
  });
test("demo chooser displays captured interfaces and each image opens its program", async ({
  page,
}) => {
  for (const name of ["MET School Pro", "MET Admission", "MET Attendance"]) {
    await page.goto("/demo");
    const card = page.getByRole("article").filter({
      has: page.getByRole("heading", { name, exact: true }),
    });
    const image = card.getByRole("img", { name: new RegExp(`หน้าจอ ${name}`) });
    await image.scrollIntoViewIfNeeded();
    await expect
      .poll(() =>
        image.evaluate((element: HTMLImageElement) => element.naturalWidth),
      )
      .toBeGreaterThan(0);
    await expect(card.locator("figcaption")).toContainText("ข้อมูลสมมติ");
    const button = card.getByRole("link", {
      name: "เปิดระบบทดลอง →",
      exact: true,
    });
    const href = await button.getAttribute("href");
    await card
      .getByRole("link", { name: `เปิด ${name} จากภาพหน้าจอ`, exact: true })
      .click();
    await expect(page).toHaveURL(new RegExp(`${href}$`));
    await expect(
      page.getByRole("heading", {
        name: name === "MET Attendance" ? "เช็กชื่อและติดตามการมาเรียน" : name,
        exact: true,
      }),
    ).toBeVisible();
  }
});

test("catalog filters and product details work", async ({ page }) => {
  await page.goto("/products");
  await expect(
    page.getByRole("link", { name: "หน้ารวมระบบโรงเรียน" }),
  ).toHaveAttribute("href", "https://education.chaylueklab.com/");
  await page.getByRole("searchbox").fill("MET Admission");
  await page.getByRole("button", { name: "ค้นหา", exact: true }).click();
  await expect(page.locator(".product-card")).toHaveCount(1);
  await page.getByRole("link", { name: "MET Admission", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "MET Admission", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "ใบสมัคร PDF ตัวอย่าง" }).click();
  await expect(
    page.getByRole("img", { name: "ใบสมัคร PDF ตัวอย่าง" }),
  ).toBeVisible();
  await page.getByRole("link", { name: /เปิดระบบทดลอง/ }).click();
  await expect(page.locator("div.demo-bar")).toContainText("ข้อมูลสมมติ");
});
test("school services links to the demo and attendance keeps school and lesson records separate", async ({
  page,
}) => {
  await page.goto("/school-systems");
  await expect(
    page.getByRole("link", { name: /แบบฟอร์ม THNIC/ }),
  ).toHaveAttribute(
    "href",
    "https://www.thnic.co.th/doc/doc.ac/2018/doc-ac-th.pdf",
  );
  await page.getByRole("link", { name: /เปิดเดโม เช็กชื่อ/ }).click();
  const status = page.getByLabel("สถานะของ ธารา");
  await status.selectOption("absent");
  await expect(page.getByRole("status")).toContainText("ขาด");
  await page.getByRole("button", { name: /08:40.*คณิตศาสตร์/ }).click();
  await expect(status).toHaveValue("");
  await status.selectOption("present");
  await page.getByLabel("โรงเรียนและห้อง").selectOption("hilltop");
  await expect(page.getByLabel("สถานะของ สายรุ้ง")).toHaveValue("");
  await page.getByLabel("โรงเรียนและห้อง").selectOption("riverside");
  await expect(status).toHaveValue("present");
  await page.getByLabel("รอบเช็กชื่อ").selectOption("daily");
  await expect(status).toHaveValue("absent");
  await expect(page.getByText("ขาด 3 · สาย 0")).toBeVisible();
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "ดาวน์โหลด CSV" }).click(),
  ]);
  const csv = await readFile((await download.path())!, "utf8");
  expect(csv).toContain('"รายวัน","01","ธารา","ขาด"');
  expect(csv).not.toContain("สายรุ้ง");
});
test("demo completes admission review and result announcement without submitting private data", async ({
  page,
}) => {
  let networkSubmission = false;
  page.on("request", (req) => {
    if (req.method() === "POST") networkSubmission = true;
  });
  await page.goto("/demo/met-admission");
  await page.getByRole("button", { name: "สมัครเรียน", exact: true }).click();
  await expect(page.getByLabel("ชื่อ-นามสกุลนักเรียน")).toHaveAttribute(
    "readonly",
    "",
  );
  await page.getByRole("button", { name: /ส่งใบสมัครตัวอย่าง/ }).click();
  await expect(page.getByRole("status")).toContainText("DEMO-2570-0001");
  await page.getByRole("button", { name: "ตรวจใบสมัคร", exact: true }).click();
  await page.getByRole("button", { name: "อนุมัติ", exact: true }).click();
  await page.getByRole("button", { name: "รอบรับสมัคร", exact: true }).click();
  await page.getByLabel("ประกาศผลการคัดเลือก").check();
  await page.getByRole("button", { name: "ตรวจสอบผล", exact: true }).click();
  await expect(page.locator(".workspace main .status").last()).toHaveText(
    "อนุมัติ",
  );
  const link = page.getByRole("link", { name: /ดาวน์โหลดใบสมัคร PDF/ });
  const href = await link.getAttribute("href");
  const pdf = await page.request.get(href!);
  expect(pdf.status()).toBe(200);
  expect((await pdf.body()).subarray(0, 5).toString()).toBe("%PDF-");
  expect(networkSubmission).toBe(false);
});
test("unknown products and protected APIs fail safely", async ({
  page,
  request,
}) => {
  expect((await page.goto("/products/does-not-exist"))?.status()).toBe(404);
  expect(
    (
      await request.get("/api/download/11111111-1111-4111-8111-000000000001")
    ).status(),
  ).toBe(401);
  expect(
    (
      await request.post("/auth/signout", {
        headers: { origin: "https://untrusted.example" },
      })
    ).status(),
  ).toBe(403);
});
