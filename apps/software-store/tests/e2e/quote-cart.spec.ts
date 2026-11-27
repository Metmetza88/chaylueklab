import { expect, test } from "@playwright/test";

test("catalog renders all twelve mockups and a usable sport demo", async ({
  page,
}) => {
  await page.goto("/products");
  await expect(page.locator(".product-card .mini-dashboard")).toHaveCount(12);
  await expect(page.locator(".preview-met-certificate img")).toHaveAttribute(
    "src",
    /^data:image\/png/,
  );
  const sport = page.locator('[data-product-slug="met-sport"]');
  await sport
    .getByRole("link", { name: "ทดลองเล่น Demo", exact: true })
    .click();
  await page.getByLabel("รายการแข่งขัน").selectOption("1");
  await page.getByLabel("คะแนนสีฟ้า").fill("10");
  await page.getByRole("button", { name: "บันทึกคะแนนตัวอย่าง" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "บันทึกคะแนนตัวอย่าง" }),
  ).toBeVisible();
  await expect(page.getByText("96 คะแนน", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "บันทึกคะแนนตัวอย่าง" }).click();
  await expect(page.getByText("96 คะแนน", { exact: true })).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "ดาวน์โหลดสรุป CSV" }).click();
  expect((await download).suggestedFilename()).toBe("met-sport-demo.csv");
});

test("a quote combines packages, persists selections and prepares one LINE message", async ({
  page,
}) => {
  await page.goto("/products");
  const sport = page.locator('[data-product-slug="met-sport"]');
  const certificate = page.locator('[data-product-slug="met-certificate"]');
  await sport
    .getByRole("button", { name: "ดูรายละเอียด / ขอใบเสนอราคา" })
    .click();
  const dialog = page.getByRole("dialog");
  const packageOption = dialog.getByRole("radio", {
    name: /พร้อมติดตั้งและเอกสารจัดซื้อ/,
  });
  await packageOption.check();
  expect((await packageOption.boundingBox())?.width).toBeLessThan(32);
  expect(
    await dialog.evaluate((element) => element.scrollWidth),
  ).toBeLessThanOrEqual((await dialog.boundingBox())!.width + 1);
  await dialog.getByRole("button", { name: "เพิ่มลงใบเสนอราคา" }).click();
  await page.keyboard.press("Escape");
  await certificate.getByRole("button", { name: "เพิ่มลงใบเสนอราคา" }).click();
  await page
    .locator(".page-heading")
    .getByRole("link", { name: /ตะกร้าใบเสนอราคา/ })
    .click();
  await expect(
    page.getByRole("heading", { name: "ตะกร้าใบเสนอราคา · 2 ระบบ" }),
  ).toBeVisible();
  await expect(page.locator(".quote-total")).toContainText("฿3,990–฿6,390");
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "ตะกร้าใบเสนอราคา · 2 ระบบ" }),
  ).toBeVisible();
  await page
    .getByLabel("ชื่อโรงเรียน", { exact: true })
    .fill("โรงเรียนตัวอย่าง");
  await page.getByLabel("เบอร์โทรติดต่อ").fill("0810000000");
  await page.getByRole("button", { name: "เตรียมคำขอรวม" }).click();
  const handoff = await page
    .getByRole("link", { name: "เปิด LINE เพื่อส่งคำขอรวม" })
    .getAttribute("href");
  expect(handoff).toContain("https://line.me/R/oaMessage/@125cbuuu/");
  expect(decodeURIComponent(handoff!)).toContain("MET Sport");
  expect(decodeURIComponent(handoff!)).toContain("MET Certificate");
  await page.getByRole("button", { name: "นำ MET Certificate ออก" }).click();
  await expect(
    page.getByRole("link", { name: "เปิด LINE เพื่อส่งคำขอรวม" }),
  ).toHaveCount(0);
});

test("comparison limits selection to three products and includes procurement categories", async ({
  page,
}) => {
  await page.goto("/compare");
  const picker = page.getByLabel("เลือกโปรแกรม");
  for (const slug of ["met-sport", "met-certificate", "met-attendance"]) {
    await picker.selectOption(slug);
    await page.getByRole("button", { name: "เพิ่มเพื่อเปรียบเทียบ" }).click();
  }
  await expect(picker).toBeDisabled();
  const table = page.getByRole("table");
  await expect(table.getByRole("columnheader")).toHaveCount(4);
  await expect(
    table.getByRole("rowheader", { name: "หมวดงานสำหรับพิจารณางบ" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "นำ MET Certificate ออก" }).click();
  await expect(picker).toBeEnabled();
});
