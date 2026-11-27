import { expect, test } from "@playwright/test";

const sport = "ระบบบริหารจัดการแข่งขันกีฬาสีภายในโรงเรียน";

test("sport leads the storefront and catalog, and header search uses the catalog", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.locator(".featured-collection article").first(),
  ).toHaveAttribute("data-product-slug", "met-sport");

  const search = page.getByRole("button", {
    name: "ค้นหาโปรแกรม",
    exact: true,
  });
  await search.click();
  const dialog = page.getByRole("dialog", { name: "ค้นหาโปรแกรม" });
  const input = dialog.getByRole("searchbox");
  await expect(input).toBeFocused();
  await input.fill("ระบบที่ไม่มีในแคตตาล็อก");
  await expect(dialog.getByRole("status")).toContainText("ไม่พบโปรแกรม");
  await input.fill(sport);
  await expect(dialog.getByRole("status")).toContainText("พบ 1 โปรแกรม");
  await dialog.getByRole("button", { name: "ดูผลในรายการระบบ" }).click();
  await expect(page).toHaveURL(/\/products\?q=/);
  await expect(page.locator(".product-card")).toHaveCount(1);
  await expect(page.locator(".product-card")).toContainText(sport);

  await page.goto("/products?sort=desc");
  await expect(page.locator(".product-card").first()).toHaveAttribute(
    "data-product-slug",
    "met-sport",
  );
  await page.getByRole("button", { name: "แจ้งเตือน", exact: true }).click();
  await expect(
    page.getByRole("dialog", { name: "ข่าวสารร้านซอฟต์แวร์" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "แจ้งเตือน", exact: true }),
  ).toBeFocused();
});

test("product quote keeps the product context and opens the existing LINE channel", async ({
  page,
}) => {
  await page.goto("/products");
  const card = page.locator('[data-product-slug="met-sport"]');
  await card
    .getByRole("button", { name: "ดูรายละเอียด / ขอใบเสนอราคา" })
    .click();
  const dialog = page.getByRole("dialog", { name: sport });
  await expect(
    dialog.getByText("เอกสารประกอบการเบิกงบโครงการกีฬาสี"),
  ).toBeVisible();
  await expect(
    dialog.getByText("ราคาเป้าหมาย · ยังไม่เปิดจำหน่าย"),
  ).toBeVisible();
  await dialog.getByRole("link", { name: "ขอใบเสนอราคา", exact: true }).click();
  await expect(page).toHaveURL(/\/contact\?product=met-sport#quotation$/);
  await expect(page.getByLabel("ข้อความสำหรับส่งทาง LINE")).toHaveValue(
    /MET Sport/,
  );
  await expect(
    page.getByRole("link", { name: "เปิด LINE Official Account" }),
  ).toHaveAttribute("href", "https://lin.ee/Vgg2m3N");
});

test("shop chat answers prices and procurement and fixed navigation reaches the relevant pages", async ({
  page,
}) => {
  await page.goto("/products");
  const nav = page.getByRole("navigation", { name: "เมนูลัดบนมือถือ" });
  if (page.viewportSize()!.width > 720) {
    await expect(nav).toBeHidden();
  } else {
    await expect(nav.getByRole("link")).toHaveCount(5);
    await nav.getByRole("link", { name: "เอกสารเบิกงบ" }).click();
    await expect(page).toHaveURL(/\/school-systems#procurement$/);
    await expect(page.locator("#procurement")).toBeInViewport();
    await nav.getByRole("link", { name: "ขอใบเสนอราคา" }).click();
    await expect(page).toHaveURL(/\/contact#quotation$/);
  }

  await expect(page.getByRole("link", { name: "แชท LINE" })).toHaveAttribute(
    "href",
    "https://lin.ee/Vgg2m3N",
  );
  await page.getByRole("button", { name: "🤖 ถามได้เลย!" }).click();
  const dialog = page.getByRole("dialog", { name: "ถามเรื่องราคาและเบิกงบ" });
  const question = dialog.getByRole("textbox", { name: "พิมพ์คำถาม" });
  await question.fill("MET Sport ราคาเท่าไหร่");
  await question.press("Enter");
  await expect(dialog.getByRole("log")).toContainText("MET Sport ราคาเป้าหมาย");
  await expect(dialog.getByRole("log")).toContainText("990");
  await dialog.getByRole("button", { name: "เอกสารเบิกงบ" }).click();
  await expect(dialog.getByRole("log")).toContainText(
    "การอนุมัติเป็นขั้นตอนของโรงเรียน",
  );
  await expect(
    dialog.getByRole("link", { name: "ขอใบเสนอราคา" }),
  ).toHaveAttribute("href", "/contact?product=met-sport#quotation");
});
