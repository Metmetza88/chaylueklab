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
    "MET Sport · ฿3,900–฿6,500 / งาน",
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

test("a school can review separate price units without putting contact data in the LINE URL", async ({
  page,
}) => {
  await page.goto("/products");
  const products = ["met-sport", "met-vote", "met-attendance", "met-admission"];
  await expect(page.locator(".market-card")).toHaveCount(5);
  for (const slug of products) {
    await page
      .locator(`[data-product-slug="${slug}"]`)
      .getByRole("button", { name: "เพิ่มลงใบเสนอราคา" })
      .click();
  }
  await page.getByRole("link", { name: "ตะกร้าใบเสนอราคา 4 รายการ" }).click();
  await expect(page).toHaveURL(/\/contact#quotation$/);
  await page.reload();
  const quote = page.getByRole("region", { name: "ตะกร้าใบเสนอราคา (4)" });
  for (const label of [
    "฿3,900–฿6,500 / งาน",
    "฿4,900–฿9,900 / ปี",
    "฿2,900–฿4,500 / ครั้ง",
  ]) {
    await expect(quote.locator(".quote-estimate")).toContainText(label);
  }
  await expect(quote.getByText(/รอประเมินราคาอีก 1 ระบบ/)).toBeVisible();
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
    .getByLabel("รายละเอียดโครงการ (ถ้ามี)")
    .fill("รายละเอียดตัวอย่าง");
  await page.evaluate(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async () => {
          throw new Error("clipboard unavailable");
        },
      },
    });
  });
  await quote.getByRole("button", { name: "ตรวจข้อความขอใบเสนอราคา" }).click();
  expect(
    await page.locator("body").getAttribute("data-request-line"),
  ).toBeNull();
  await quote.getByRole("button", { name: /คัดลอกและเปิดแชท LINE/ }).click();
  const message = quote.getByLabel("ข้อความสำหรับส่งทาง LINE");
  await expect(message).toHaveValue(/โรงเรียนตัวอย่าง/);
  for (const name of ["MET Sport", "MET Vote", "MET Attendance"]) {
    await expect(message).toHaveValue(new RegExp(name));
  }
  await expect(message).toHaveValue(/ยอดประเมินต่อปี: ฿4,900–฿9,900/);
  await expect(message).toHaveValue(/รอประเมินอีก 1 ระบบ/);
  await expect(message).toHaveValue(/รายละเอียดตัวอย่าง/);
  const link = await quote
    .getByRole("link", { name: /เปิดแชทอีกครั้ง/ })
    .getAttribute("href");
  expect(link).toBe("https://line.me/R/oaMessage/%40125cbuuu");
  expect(await page.locator("body").getAttribute("data-request-line")).toBe(
    link,
  );
  await quote
    .getByRole("button", { name: "คัดลอกข้อความ", exact: true })
    .click();
  await expect(quote.getByText(/เลือกข้อความแล้ว/)).toBeVisible();
  await quote.getByRole("button", { name: "นำ MET Vote ออก" }).click();
  await expect(message).toHaveCount(0);
  const reducedQuote = page.getByRole("region", {
    name: "ตะกร้าใบเสนอราคา (3)",
  });
  await expect(reducedQuote.locator(".quote-estimate")).not.toContainText(
    "2,900",
  );
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

test("catalog, details and popup use product-specific prices", async ({
  page,
}) => {
  await page.goto("/products");
  const met = [
    ["met-sport", "฿3,900–฿6,500 / งาน"],
    ["met-attendance", "฿4,900–฿9,900 / ปี"],
    ["met-vote", "฿2,900–฿4,500 / ครั้ง"],
    ["met-admission", "ขอใบเสนอราคาตามขอบเขตงาน"],
    ["met-school-pro", "ขอใบเสนอราคาตามขอบเขตงาน"],
  ];
  for (const [slug, price] of met) {
    await expect(
      page.locator(`[data-product-slug="${slug}"] .product-bottom`),
    ).toContainText(price);
  }
  await page
    .locator('[data-product-slug="met-sport"]')
    .getByRole("button", { name: "ดูรายละเอียด / ขอใบเสนอราคา" })
    .click();
  await expect(
    page.getByRole("dialog").locator(".school-package"),
  ).toContainText(met[0][1]);
  for (const [slug, price] of met) {
    await page.goto(`/products/${slug}`);
    await expect(page.locator(".school-package")).toContainText(price);
  }
});

test("School Pro publishes and removes a sample announcement", async ({
  page,
}) => {
  await page.goto("/demo/met-school-pro");
  await page
    .getByText("ทดลองจัดการข่าว (บทบาทผู้ดูแลสมมติ)", { exact: true })
    .click();
  const news = "กิจกรรมเปิดบ้านวิชาการ (ข้อมูลสมมติ)";
  await page.getByLabel("เลือกข่าวตัวอย่าง").selectOption(news);
  await page.getByRole("button", { name: "เผยแพร่ข่าวตัวอย่าง" }).click();
  await expect(page.getByRole("heading", { name: news })).toBeVisible();
  await page.getByRole("button", { name: "นำข่าวล่าสุดออก" }).click();
  await expect(page.getByRole("heading", { name: news })).toHaveCount(0);
});

test("direct quote removes an unpriced item without inventing a total", async ({
  page,
}) => {
  await page.goto("/contact?product=met-admission#quotation");
  const quote = page.getByRole("region", { name: "ตะกร้าใบเสนอราคา (1)" });
  await expect(
    quote.getByText("ราคาทั้งหมดรอประเมินตามขอบเขตงาน"),
  ).toBeVisible();
  await expect(quote.locator(".quote-estimate")).toHaveCount(0);
  await quote.getByRole("button", { name: "นำ MET Admission ออก" }).click();
  await expect(
    page.getByRole("region", { name: "ตะกร้าใบเสนอราคา (0)" }),
  ).toBeVisible();
});
