import { test, expect } from "@playwright/test";
const pages = [
  "/",
  "/products",
  "/categories",
  "/demo",
  "/demo/met-school-pro",
  "/demo/met-admission",
  "/cart",
  "/checkout",
  "/login",
  "/register",
  "/membership",
  "/support",
  "/contact",
  "/guide",
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
test("catalog filters and product details work", async ({ page }) => {
  await page.goto("/products");
  await page.getByRole("searchbox").fill("MET Admission");
  await page.getByRole("button", { name: "ค้นหา", exact: true }).click();
  await expect(page.locator(".product-card")).toHaveCount(1);
  await page.getByRole("link", { name: "MET Admission", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "MET Admission", exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: /เปิดระบบทดลอง/ }).click();
  await expect(page.locator("div.demo-bar")).toContainText("ข้อมูลสมมติ");
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
