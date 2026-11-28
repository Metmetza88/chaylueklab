import { expect, test } from "@playwright/test";

const bundleName = "MET Sport + อุปกรณ์กีฬาสี";

test("supplies links preserve the full sports bundle in an editable LINE draft", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/products?collection=supplies");
  await expect(
    page.getByRole("heading", { name: "อุปกรณ์กีฬาสี", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "อุปกรณ์การเรียน & พัสดุสำนักงาน" })
    .click();
  await expect(page).toHaveURL(/section=supplies/);
  await page.getByRole("link", { name: "ขอราคาพร้อม MET Sport" }).click();
  await expect(page.getByText(bundleName, { exact: true })).toBeVisible();
  const draft = page.getByLabel("ข้อความสำหรับส่งทาง LINE").first();
  await expect(draft).toBeEditable();
  await expect(draft).toHaveValue(
    /MET Sport \+ อุปกรณ์กีฬาสี[\s\S]*วันที่จัดกีฬาสี[\s\S]*รายการอุปกรณ์และจำนวน[\s\S]*จำนวนเจ้าหน้าที่บันทึกคะแนน/,
  );
  const edited = (await draft.inputValue()).replace(
    "วันที่จัดกีฬาสี:",
    "วันที่จัดกีฬาสี: 10 ต.ค. 2570",
  );
  await draft.fill(edited);
  await page.getByRole("button", { name: "คัดลอกข้อความ" }).first().click();
  await expect(
    page.getByRole("status").filter({ hasText: "คัดลอกข้อความแล้ว" }),
  ).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    edited,
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

test("existing standalone and combined inquiries keep their intended scope", async ({
  page,
}) => {
  const cases = [
    ["/contact?product=met-sport#quotation", /ระบบที่สนใจ: .*MET Sport/, false],
    [
      `/contact?program=${encodeURIComponent("อุปกรณ์กีฬาสี")}#quotation`,
      /ระบบที่สนใจ: อุปกรณ์กีฬาสี/,
      false,
    ],
    [
      `/contact?program=${encodeURIComponent(bundleName)}#quotation`,
      /รายการที่สนใจ: MET Sport \+ อุปกรณ์กีฬาสี/,
      true,
    ],
  ] as const;
  for (const [route, scope, bundle] of cases) {
    await page.goto(route);
    await expect(
      page.getByLabel("ข้อความสำหรับส่งทาง LINE").first(),
    ).toHaveValue(scope);
    await expect(
      page.getByText("ขอใบเสนอราคาระบบเดียว", { exact: true }),
    ).toHaveCount(bundle ? 0 : 1);
  }
});
