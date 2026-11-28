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
  await expect(dialog.getByText("ประเมินตามขอบเขตงาน")).toBeVisible();
  await dialog.getByRole("link", { name: "ขอใบเสนอราคา", exact: true }).click();
  await expect(page).toHaveURL(/\/contact\?product=met-sport#quotation$/);
  await expect(page.getByLabel("ข้อความสำหรับส่งทาง LINE")).toHaveValue(
    /MET Sport/,
  );
  await expect(
    page.getByRole("link", { name: "เปิด LINE OA @125cbuuu" }),
  ).toHaveAttribute("href", /^https:\/\/line\.me\/R\/oaMessage\/%40125cbuuu\//);
});

test("shop chat answers prices and procurement and fixed navigation reaches the relevant pages", async ({
  page,
}) => {
  await page.goto("/products");
  const nav = page.getByRole("navigation", { name: "เมนูลัดบนมือถือ" });
  if (page.viewportSize()!.width > 720) {
    await expect(nav).toBeHidden();
  } else {
    await expect(nav.getByRole("link")).toHaveCount(3);
    await expect(nav.getByRole("button")).toHaveCount(2);
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
    /^https:\/\/line\.me\/R\/oaMessage\/%40125cbuuu\//,
  );
  await page.getByRole("button", { name: "🤖 ถามได้เลย!" }).click();
  const dialog = page.getByRole("dialog", { name: "ถามเรื่องราคาและเบิกงบ" });
  const question = dialog.getByRole("textbox", { name: "พิมพ์คำถาม" });
  await question.fill("MET Sport ราคาเท่าไหร่");
  await question.press("Enter");
  await expect(dialog.getByRole("log")).toContainText(
    "MET Sport เปิดรับออเดอร์",
  );
  await dialog
    .getByRole("button", { name: "เอกสารเบิกงบ", exact: true })
    .first()
    .click();
  await expect(dialog.getByRole("log")).toContainText(
    "การอนุมัติเป็นขั้นตอนของโรงเรียน",
  );
  await expect(
    dialog.getByRole("link", { name: "ขอใบเสนอราคา" }),
  ).toHaveAttribute("href", "/contact?product=met-sport#quotation");
});

test("a school can combine three programs and send one prepared LINE request", async ({
  page,
}) => {
  await page.goto("/products");
  const products = ["met-sport", "met-vote", "met-attendance"];
  await expect(page.locator(".market-card")).toHaveCount(5);
  for (const slug of products) {
    await page
      .locator(`[data-product-slug="${slug}"]`)
      .getByRole("button", { name: "เพิ่มลงใบเสนอราคา" })
      .click();
  }
  await page.getByRole("link", { name: "ตะกร้าใบเสนอราคา 3 รายการ" }).click();
  await expect(page).toHaveURL(/\/contact#quotation$/);
  await page.reload();
  const quote = page.getByRole("region", { name: "ตะกร้าใบเสนอราคา (3)" });
  await expect(quote.getByText("MET Vote", { exact: true })).toBeVisible();
  await expect(quote.locator(".quote-estimate")).toContainText(
    "฿10,500–฿26,700",
  );
  await quote.getByLabel("ชื่อโรงเรียน").fill("โรงเรียนตัวอย่าง");
  await quote.getByLabel("ชื่อผู้ติดต่อ").fill("ครูตัวอย่าง");
  await quote.getByLabel("เบอร์โทร").fill("0840000000");
  await quote.getByLabel("หมวดงบประมาณ").selectOption("เงินรายได้สถานศึกษา");
  await page.evaluate(() => {
    window.open = (url) => {
      document.body.dataset.requestLine = String(url);
      return null;
    };
  });
  await quote
    .getByRole("button", { name: "เปิด LINE พร้อมคำขอใบเสนอราคา" })
    .click();
  const message = quote.getByLabel("ข้อความสำหรับส่งทาง LINE");
  await expect(message).toHaveValue(/โรงเรียนตัวอย่าง/);
  for (const name of ["MET Sport", "MET Vote", "MET Attendance"]) {
    await expect(message).toHaveValue(new RegExp(name));
  }
  const link = await quote
    .getByRole("link", { name: /เปิดคำขออีกครั้ง/ })
    .getAttribute("href");
  expect(decodeURIComponent(link ?? "")).toContain(
    "/oaMessage/@125cbuuu/?ขอใบเสนอราคาแพ็กเกจสำหรับโรงเรียน",
  );
  const actual = await page.locator("body").getAttribute("data-request-line");
  expect(actual).toBe(link);
  expect(decodeURIComponent(actual ?? "")).toContain("เงินรายได้สถานศึกษา");
});

test("all procurement samples download and the sports demo updates scores", async ({
  page,
  request,
}) => {
  await page.goto("/products");
  await page
    .locator(".market-procurement-banner")
    .getByRole("button", { name: "เอกสารเบิกงบ" })
    .click();
  const docs = page.getByRole("dialog", { name: "เอกสารเบิกงบ" });
  const links = await docs
    .locator("a[download]")
    .evaluateAll((nodes) =>
      nodes.map((node) => node.getAttribute("href") ?? ""),
    );
  expect(links).toHaveLength(10);
  for (const link of links) {
    const response = await request.get(link);
    expect(response.ok()).toBeTruthy();
    const body = await response.body();
    expect(body.subarray(0, 4).toString()).toBe(
      link.endsWith(".pdf") ? "%PDF" : "PK\x03\x04",
    );
  }
  await page.keyboard.press("Escape");
  await page
    .locator('[data-product-slug="met-sport"]')
    .getByRole("button", { name: "ทดลองใช้ตัวจริง (Live Demo)" })
    .click();
  const demo = page.getByRole("dialog", { name: "ทดลองใช้ MET Sport" });
  await expect(demo).toBeVisible();
  const blue = demo.getByRole("article", { name: "สีฟ้า" });
  await expect(blue.getByText("8 คะแนน")).toBeVisible();
  await blue
    .getByRole("button", { name: "เพิ่มเหรียญทอง สีฟ้า", exact: true })
    .click();
  await expect(blue.getByText("11 คะแนน")).toBeVisible();
  await page.getByLabel("คะแนนสีฟ้า").fill("2");
  await page.getByRole("button", { name: "บันทึกผลตัวอย่าง" }).click();
  await expect(page.locator(".sport-rankings")).toContainText("28 คะแนน");
  await page.getByLabel("คะแนนสีทอง").fill("3");
  await page.getByRole("button", { name: "บันทึกผลตัวอย่าง" }).click();
  await expect(page.locator(".sport-rankings")).toContainText("23 คะแนน");
  await expect(page.locator(".sport-rankings")).toContainText("25 คะแนน");
  await page.getByRole("button", { name: "ล้างผลตัวอย่าง" }).click();
  await expect(page.getByLabel("คะแนนสีทอง")).toHaveValue("0");
});

test("attendance and voting sandboxes operate without an account", async ({
  page,
}) => {
  await page.goto("/demo/met-attendance");
  await page
    .getByRole("button", { name: "จำลองสแกนบัตรนักเรียน QR Code" })
    .click();
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "LINE OA · แจ้งผู้ปกครองตัวอย่าง" }),
  ).toContainText("07:42");
  await page.goto("/demo/met-vote");
  await page.getByRole("radio", { name: /เบอร์ 2/ }).check();
  await page.getByRole("button", { name: "ลงคะแนนตัวอย่าง" }).click();
  await expect(page.getByText("15 คะแนน", { exact: true })).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "ลงคะแนนตัวอย่าง" }),
  ).toBeDisabled();
  await expect(page.getByText("15 คะแนน", { exact: true })).toBeVisible();
});
