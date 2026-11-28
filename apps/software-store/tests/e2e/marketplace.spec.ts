import { expect, test } from "@playwright/test";

const line = "https://line.me/R/ti/p/%40125cbuuu";
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
    dialog.getByText("ราคาเป้าหมาย · ยืนยันตามขอบเขตงาน"),
  ).toBeVisible();
  await dialog.getByRole("link", { name: "ขอใบเสนอราคา", exact: true }).click();
  await expect(page).toHaveURL(/\/contact\?product=met-sport#quotation$/);
  await expect(page.getByLabel("ข้อความสำหรับส่งทาง LINE")).toHaveValue(
    /MET Sport/,
  );
  await expect(
    page.getByRole("link", { name: "เปิด LINE OA @125cbuuu" }),
  ).toHaveAttribute("href", line);
});

test("shop chat answers prices and procurement and fixed navigation reaches the relevant pages", async ({
  page,
}) => {
  await page.goto("/products");
  const nav = page.getByRole("navigation", { name: "เมนูลัดบนมือถือ" });
  if (page.viewportSize()!.width > 720) {
    await expect(nav).toBeHidden();
  } else {
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            document.documentElement.scrollWidth -
            document.documentElement.clientWidth,
        ),
      )
      .toBe(0);
    await expect(nav.getByRole("link")).toHaveCount(3);
    await nav.getByRole("button", { name: "เอกสารเบิกงบ" }).click();
    await expect(
      page.getByRole("dialog", { name: "เอกสารเบิกงบ" }),
    ).toBeVisible();
    await page.keyboard.press("Escape");
    await nav.getByRole("link", { name: "ขอใบเสนอราคา" }).click();
    await expect(page).toHaveURL(/\/contact#quotation$/);
  }

  await expect(page.getByRole("link", { name: "แชท LINE" })).toHaveAttribute(
    "href",
    line,
  );
  await page.getByRole("button", { name: "🤖 ถามได้เลย!" }).click();
  const dialog = page.getByRole("dialog", { name: "ถามเรื่องราคาและเบิกงบ" });
  const question = dialog.getByRole("textbox", { name: "พิมพ์คำถาม" });
  await question.fill("MET Sport ราคาเท่าไหร่");
  await question.press("Enter");
  await expect(dialog.getByRole("log")).toContainText("MET Sport ราคาเป้าหมาย");
  await expect(dialog.getByRole("log")).toContainText("990");
  await dialog
    .locator(".market-links")
    .first()
    .getByRole("button", { name: "เอกสารเบิกงบ" })
    .click();
  await expect(dialog.getByRole("log")).toContainText(
    "การอนุมัติเป็นขั้นตอนของโรงเรียน",
  );
  await expect(
    dialog.getByRole("link", { name: "ขอใบเสนอราคา" }),
  ).toHaveAttribute("href", "/contact?product=met-sport#quotation");
});

test("school ordering, procurement downloads and local contact are discoverable", async ({
  page,
  request,
}) => {
  await page.goto("/products");
  const cards = page.locator(".product-card");
  await expect(cards).toHaveCount(15);
  for (const slug of ["met-sport", "met-attendance", "met-admission", "met-school-pro"]) {
    const card = cards.filter({ has: page.locator(`a[href="/demo/${slug}"]`) });
    await expect(card).toHaveCount(1);
    await expect(card.locator(".status")).toHaveText(/^(เปิดรับออเดอร์|พร้อมใช้งาน)$/);
  }
  await expect(cards.filter({ hasText: "แผนพัฒนา" })).toHaveCount(11);
  await expect(cards.filter({ hasText: "ภาพจำลองแนวคิด" })).toHaveCount(11);
  await expect(
    page.getByText("จัดจำหน่ายและออกเอกสารในนาม ร้าน พ.สมนึก 2&3"),
  ).toBeVisible();

  await page
    .getByRole("complementary", { name: "เอกสารจัดซื้อสำหรับโรงเรียน" })
    .getByRole("button", { name: "เอกสารเบิกงบ" })
    .click();
  const procurement = page.getByRole("dialog", { name: "เอกสารเบิกงบ" });
  await expect(procurement.getByText("ใบส่งมอบงาน")).toBeVisible();
  await expect(procurement.getByText("ใบเสร็จรับเงิน")).toBeVisible();
  await expect(
    procurement.getByRole("link", {
      name: "ขอรับไฟล์ตัวอย่างทาง LINE @125cbuuu",
    }),
  ).toHaveAttribute("href", line);
  const downloads = procurement.getByRole("link", { name: /^ดาวน์โหลด/ });
  await expect(downloads).toHaveCount(6);
  for (const download of await downloads.all()) {
    const href = await download.getAttribute("href");
    expect(href).toMatch(/^\/procurement\//);
    const response = await request.get(href!);
    expect(response.ok()).toBeTruthy();
    const bytes = await response.body();
    expect(bytes.subarray(0, 4).toString()).toBe(
      href!.endsWith(".pdf") ? "%PDF" : "PK\u0003\u0004",
    );
  }
  await page.keyboard.press("Escape");

  await page
    .locator(".market-header-actions")
    .getByRole("button", { name: "ติดต่อเรา" })
    .click();
  const contact = page.getByRole("dialog", { name: "ติดต่อเรา" });
  await expect(
    contact.getByText(
      "พร้อมเข้าสาธิตระบบถึงโรงเรียนในพื้นที่ อ.สตึก และ จ.บุรีรัมย์",
    ),
  ).toBeVisible();
  await expect(
    contact.getByRole("link", { name: "LINE OA @125cbuuu" }),
  ).toHaveAttribute("href", line);
  await page.keyboard.press("Escape");

  await page
    .getByRole("link", {
      name: "อุปกรณ์การเรียน & พัสดุสำนักงาน (ร้าน พ.สมนึก 2&3)",
    })
    .click();
  await expect(
    page.getByRole("heading", { name: "อุปกรณ์กีฬาสี" }),
  ).toBeVisible();
  await page
    .getByRole("article")
    .filter({ hasText: "อุปกรณ์กีฬาสี" })
    .getByRole("link", { name: "ขอใบเสนอราคา" })
    .click();
  await expect(page.getByLabel("ข้อความสำหรับส่งทาง LINE")).toHaveValue(
    /อุปกรณ์กีฬาสี/,
  );
});

test("MET Sport demo adds and resets sample scores", async ({ page }) => {
  await page.goto("/products");
  const card = page.locator('[data-product-slug="met-sport"]');
  await card.getByRole("link", { name: "ทดลองดูตัวอย่าง (Demo)" }).click();
  await expect(
    page.getByRole("heading", { name: "ทดลองบันทึกคะแนนกีฬาสี" }),
  ).toBeVisible();
  const blue = page.locator("dl > div").filter({ hasText: "ทีมสีฟ้า" });
  await expect(blue).toContainText("22 คะแนนรวม");
  await page.getByRole("button", { name: "เพิ่ม 1 คะแนน" }).click();
  await expect(blue).toContainText("23 คะแนนรวม");
  await page.getByRole("button", { name: "คืนคะแนนตัวอย่าง" }).click();
  await expect(blue).toContainText("22 คะแนนรวม");
});
