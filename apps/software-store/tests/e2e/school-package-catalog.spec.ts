import { expect, test } from "@playwright/test";

test("primary catalog has only four school packages, four unique playable captures, and Sport first", async ({
  page,
}) => {
  await page.goto("/products");
  const cards = page.locator("[data-product-slug]");
  await expect(cards).toHaveCount(4);
  await expect(cards.first()).toHaveAttribute("data-product-slug", "met-sport");
  const photos = new Set<string>();
  for (const slug of [
    "met-sport",
    "met-attendance",
    "met-admission",
    "met-school-pro",
  ]) {
    const card = page.locator(`[data-product-slug="${slug}"]`);
    await expect(card).toContainText("3,500–8,900 บาท");
    await expect(card).toContainText("เดโมใช้ข้อมูลสมมติ");
    await expect(card).not.toContainText(/฿\s*(490|590|990)\b/);
    const demo = card.locator(`a[href="/demo/${slug}"]`).first();
    await expect(demo).toBeVisible();
    const photo = card.locator("img").first();
    const source = (await photo.getAttribute("src")) ?? "";
    expect(source).toBeTruthy();
    expect(decodeURIComponent(source)).not.toMatch(/\.svg(?:\?|&|$)/i);
    photos.add(source);
  }
  expect(photos.size).toBe(4);
  await expect(
    page.getByRole("heading", { name: "แพ็กเกจซอฟต์แวร์โรงเรียน" }),
  ).toBeVisible();
  await page
    .getByRole("searchbox", { name: "ค้นหาโปรแกรม" })
    .last()
    .fill("MET Admission");
  await page
    .locator("form.filters")
    .getByRole("button", { name: "ค้นหา", exact: true })
    .click();
  await expect(cards).toHaveCount(1);
  await expect(cards.first()).toHaveAttribute(
    "data-product-slug",
    "met-admission",
  );
});

test("school package browsing does not delete past direct detail routes", async ({
  page,
}) => {
  await page.goto("/products");
  await expect(
    page.locator('[data-product-slug="met-certificate"]'),
  ).toHaveCount(0);
  const legacy = await page.goto("/products/met-certificate");
  expect(legacy?.status()).toBe(200);
  await expect(
    page.getByRole("heading", { name: "MET Certificate", exact: true }).first(),
  ).toBeVisible();
});
