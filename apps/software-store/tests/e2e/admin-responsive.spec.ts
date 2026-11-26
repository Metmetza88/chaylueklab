import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
const accounts = JSON.parse(readFileSync("tests/local/.accounts.json", "utf8"));

test("authenticated owner can use admin sections and controls without page overflow", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByLabel("อีเมล", { exact: true }).fill(accounts.owner.email);
  await page
    .getByLabel("รหัสผ่าน", { exact: true })
    .fill(accounts.owner.password);
  await page.getByRole("button", { name: "เข้าสู่ระบบ", exact: true }).click();
  await expect(page).toHaveURL(/\/orders/);
  await page.goto("/admin");
  await expect(
    page.getByRole("heading", { name: "ภาพรวมร้านค้า", exact: true }),
  ).toBeVisible();
  const product = page.locator("#products details").first();
  await product.locator("summary").click();
  await expect(product.locator('input[name="price_cents"]')).toBeVisible();
  await expect(product.locator('select[name="status"]')).toBeVisible();
  await page.locator('a[href="#releases"]').click();
  const upload = page.locator("#releases form").first();
  await upload
    .getByRole("button", { name: "อัปโหลด release", exact: true })
    .scrollIntoViewIfNeeded();
  await expect(
    upload.getByRole("button", { name: "อัปโหลด release", exact: true }),
  ).toBeInViewport();
  const widths = await page.evaluate(() => ({
    content: document.documentElement.scrollWidth,
    viewport: innerWidth,
  }));
  expect(widths.content).toBeLessThanOrEqual(widths.viewport + 1);
});
