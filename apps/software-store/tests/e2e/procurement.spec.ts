import { test, expect } from "@playwright/test";

test("school procurement opens from the storefront and all six templates download", async ({
  page,
  request,
  isMobile,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("region", { name: "ข้อมูลผู้จัดจำหน่ายและเอกสารจัดซื้อ" }),
  ).toContainText("ร้าน พ.สมนึก 2&3");
  if (isMobile && (page.viewportSize()?.width ?? 1200) <= 720) {
    await page
      .getByRole("navigation", { name: "เมนูลัดบนมือถือ" })
      .getByRole("button", { name: "เอกสารเบิกงบ" })
      .click();
    const modal = page.getByRole("dialog", { name: "เอกสารเบิกงบและจัดซื้อ" });
    await expect(modal).toBeVisible();
    const download = page.waitForEvent("download");
    await modal
      .getByRole("link", { name: "ดาวน์โหลด Word ตัวอย่างใบเสนอราคา" })
      .click();
    expect((await download).suggestedFilename()).toBe("quotation.docx");
    await page.keyboard.press("Escape");
    await expect(modal).not.toBeVisible();
    await page
      .getByRole("navigation", { name: "เมนูลัดบนมือถือ" })
      .getByRole("button", { name: "ติดต่อเรา" })
      .click();
    await expect(page.getByRole("dialog", { name: "ติดต่อเรา" })).toContainText(
      "@125cbuuu",
    );
    await page.keyboard.press("Escape");
  }
  await page.getByRole("link", { name: "ดูเอกสารจัดซื้อ" }).click();
  const documents = page.locator("#procurement .procurement-documents");
  await expect(
    documents
      .getByRole("list", { name: "ชุดตัวอย่างเอกสาร" })
      .getByRole("link"),
  ).toHaveCount(6);
  for (const slug of ["quotation", "tor", "approval-memo"]) {
    for (const [extension, signature] of [
      ["pdf", "%PDF"],
      ["docx", "PK"],
    ]) {
      const delivery = await request.get(
        `/documents/procurement/${slug}.${extension}`,
      );
      expect(delivery.ok()).toBeTruthy();
      expect(
        (await delivery.body()).toString("ascii", 0, signature.length),
      ).toBe(signature);
    }
  }
  await expect(
    documents.getByRole("link", { name: "ขอไฟล์ตัวอย่างทาง LINE" }),
  ).toHaveAttribute("href", /^https:\/\/line\.me\/R\/oaMessage\/%40125cbuuu\//);
});

test("catalog separates verified demos, concept art, supplies, and the price-request draft", async ({
  page,
}) => {
  await page.goto("/products");
  const cards = page.locator(".product-card");
  await expect(cards.first()).toHaveAttribute("data-product-slug", "met-sport");
  const sport = cards.first();
  await expect(sport.getByRole("img")).toHaveAttribute(
    "src",
    "/art/concepts/met-sport.svg",
  );
  await expect(
    sport.getByRole("link", { name: "ดูตัวอย่างหน้าจอ" }),
  ).toHaveAttribute("href", "/products/met-sport#concept");
  const preview = page.locator('[data-product-slug="met-admission"]');
  await expect(
    preview.getByRole("link", { name: "ทดลองดูตัวอย่าง (Demo)" }),
  ).toHaveAttribute("href", "/demo/met-admission");
  await page
    .getByRole("link", { name: "อุปกรณ์การเรียน & พัสดุสำนักงาน" })
    .click();
  await expect(
    page.getByRole("link", { name: "ดูหน้าร้าน พ.สมนึก 2&3" }),
  ).toHaveAttribute("href", "https://psomnuek.chaylueklab.com/work?view=shop");
  await page.goto("/products/met-sport");
  await expect(
    page.getByText("ภาพแนวคิดหน้าจอ · ไม่ใช่หน้าจอระบบจริง"),
  ).toBeVisible();
  await page.getByRole("link", { name: /ขอใบเสนอราคา \/ ประเมินงาน/ }).click();
  const draft = await page
    .getByRole("link", { name: "เปิดร่างข้อความขอราคาทาง LINE" })
    .getAttribute("href");
  expect(draft?.split("?")[0]).toBe("https://line.me/R/oaMessage/%40125cbuuu/");
  expect(decodeURIComponent(draft?.split("?")[1] ?? "")).toContain(
    "จำนวนทีมและชนิดกีฬา",
  );
  await expect(
    page.getByRole("link", { name: "เปิดแชต LINE แบบไม่ใส่ข้อความ" }),
  ).toHaveAttribute("href", "https://lin.ee/Vgg2m3N");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
});
