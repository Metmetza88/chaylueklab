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
  await expect(dialog.getByText("3,500–8,900 บาท")).toBeVisible();
  await dialog.getByRole("link", { name: "ขอใบเสนอราคา", exact: true }).click();
  await expect(page).toHaveURL(/\/contact\?product=met-sport#quotation$/);
  await expect(page.getByLabel("ข้อความสำหรับส่งทาง LINE")).toHaveValue(
    /MET Sport/,
  );
  await expect(
    page.getByRole("link", { name: "เปิด LINE OA @125cbuuu", exact: true }),
  ).toHaveAttribute(
    "href",
    /^https:\/\/line\.me\/R\/oaMessage\/%40125cbuuu\/\?/,
  );
  await expect(
    page.getByRole("link", {
      name: "เปิด LINE OA แบบปกติ / เพิ่มเพื่อน",
      exact: true,
    }),
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
    /^https:\/\/line\.me\/R\/oaMessage\/%40125cbuuu\/\?/,
  );
  await page.getByRole("button", { name: "🤖 ถามได้เลย!" }).click();
  const dialog = page.getByRole("dialog", { name: "ถามเรื่องราคาและเบิกงบ" });
  const question = dialog.getByRole("textbox", { name: "พิมพ์คำถาม" });
  await question.fill("MET Sport ราคาเท่าไหร่");
  await question.press("Enter");
  await expect(dialog.getByRole("log")).toContainText(
    "MET Sport แพ็กเกจโรงเรียน 3,500–8,900 บาท (ประมาณการต่อระบบ)",
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

test("a school can review three packages while private fields stay out of the LINE URL", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/products");
  await page.evaluate(() =>
    localStorage.setItem(
      "chaylueklab-quote-selection",
      JSON.stringify({ "met-certificate": "files" }),
    ),
  );
  await page.reload();
  for (const slug of ["met-sport", "met-admission", "met-attendance"]) {
    await page
      .locator(`[data-product-slug="${slug}"]`)
      .getByRole("button", { name: "เพิ่มลงใบเสนอราคา" })
      .click();
  }
  await page.getByRole("link", { name: "ตะกร้าใบเสนอราคา 3 รายการ" }).click();
  await expect(page).toHaveURL(/\/contact#quotation$/);
  await page.reload();
  const quote = page.getByRole("region", { name: "ตะกร้าใบเสนอราคา (3)" });
  await expect(quote.getByText("MET Certificate", { exact: true })).toHaveCount(
    0,
  );
  await expect(quote.getByText(/มี 1 รายการที่บันทึกไว้/)).toBeVisible();
  await expect(quote.locator(".quote-estimate")).toContainText(
    "10,500–26,700 บาท",
  );
  await expect(quote.getByLabel("แพ็กเกจ", { exact: true })).toHaveCount(0);

  const prepare = quote.getByRole("button", {
    name: "เตรียมคำขอใบเสนอราคารวม",
  });
  await prepare.click();
  await expect(quote.getByLabel("ข้อความสำหรับส่งทาง LINE")).toHaveCount(0);
  await quote.getByLabel("ชื่อโรงเรียน").fill("โรงเรียนตัวอย่าง");
  await quote.getByLabel("ชื่อผู้ติดต่อ").fill("ผู้ประสานงานตัวอย่าง");
  await quote.getByLabel("เบอร์โทร").fill("0840000000");
  await quote.getByLabel("แหล่งงบประมาณ").selectOption("learner-development");
  await quote.getByLabel(/ช่วงงบประมาณ/).selectOption("unknown");
  await quote.getByLabel(/รายละเอียดโครงการ/).fill("หมายเหตุส่วนตัวสมมติ");

  const requests: string[] = [];
  page.on("request", (req) =>
    requests.push(req.url() + (req.postData() ?? "")),
  );
  await prepare.click();
  const message = quote.getByLabel("ข้อความสำหรับส่งทาง LINE");
  const draft = await message.inputValue();
  for (const expected of [
    "โรงเรียนตัวอย่าง",
    "ผู้ประสานงานตัวอย่าง",
    "0840000000",
    "หมายเหตุส่วนตัวสมมติ",
    "MET Sport",
    "MET Admission",
    "MET Attendance",
    "แหล่งงบประมาณ: งบกิจกรรมพัฒนาผู้เรียน",
    "ยังไม่ทราบ / ยังไม่กำหนด",
    "ยอดประเมินเบื้องต้น: 10,500–26,700 บาท (ไม่ใช่ราคายืนยัน)",
  ])
    expect(draft).toContain(expected);
  await quote.getByRole("button", { name: "คัดลอกข้อความ" }).click();
  await expect(quote.getByText("คัดลอกข้อความแล้ว")).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(draft);

  const external = quote.getByRole("link", {
    name: /เปิด LINE เพื่อส่งคำขอรวม/,
  });
  const href = await external.getAttribute("href");
  expect(decodeURIComponent(href ?? "")).toContain(
    "/oaMessage/@125cbuuu/?ขอใบเสนอราคารวม",
  );
  for (const safe of [
    "MET Sport",
    "MET Admission",
    "MET Attendance",
    "10,500–26,700 บาท",
  ]) {
    expect(decodeURIComponent(href ?? "")).toContain(safe);
  }
  await expect(external).toHaveAttribute("referrerpolicy", "no-referrer");
  // The live app handoff requires an installed LINE client. Validate clipboard in
  // a real click while suppressing external navigation from this test.
  await page.evaluate(() => {
    document.addEventListener("click", (event) => event.preventDefault(), {
      once: true,
    });
    return navigator.clipboard.writeText("");
  });
  await external.click();
  await expect(
    quote.getByText("คัดลอกข้อความฉบับเต็มแล้ว", { exact: false }),
  ).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(draft);
  await expect(
    quote.getByRole("link", { name: "เปิด LINE OA แบบปกติ", exact: true }),
  ).toHaveAttribute("href", "https://lin.ee/Vgg2m3N");
  const locallySaved = await page.evaluate(() =>
    localStorage.getItem("chaylueklab-quote-selection"),
  );
  for (const privateField of [
    "โรงเรียนตัวอย่าง",
    "ผู้ประสานงานตัวอย่าง",
    "0840000000",
    "หมายเหตุส่วนตัวสมมติ",
    "งบกิจกรรมพัฒนาผู้เรียน",
  ]) {
    expect(decodeURIComponent(href ?? "")).not.toContain(privateField);
    expect(locallySaved).not.toContain(privateField);
    expect(requests.join("\n")).not.toContain(privateField);
  }
  await quote.getByLabel("ชื่อโรงเรียน").fill("แก้ชื่อโรงเรียน");
  await expect(message).toHaveCount(0);
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
  await expect(
    docs.getByRole("link", { name: "ขอรับไฟล์ตัวอย่างทาง LINE" }),
  ).toHaveAttribute(
    "href",
    /^https:\/\/line\.me\/R\/oaMessage\/%40125cbuuu\/\?/,
  );
  await expect(
    docs.getByRole("link", { name: "เพิ่มเพื่อน LINE OA" }),
  ).toHaveAttribute("href", "https://lin.ee/Vgg2m3N");
  const links = await docs
    .locator("a[download]")
    .evaluateAll((nodes) =>
      nodes.map((node) => node.getAttribute("href") ?? ""),
    );
  expect(links).toHaveLength(6);
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
    .getByRole("link", { name: "ทดลองดูตัวอย่าง (Demo)" })
    .click();
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
