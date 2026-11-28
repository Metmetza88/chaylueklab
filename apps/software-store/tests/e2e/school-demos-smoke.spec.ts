import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  // Public demos may download sample files, but must not send a real mutation.
  await page.route("**/*", async (route) => {
    const request = route.request();
    if (["POST", "PUT", "PATCH", "DELETE"].includes(request.method())) {
      throw new Error("The public demo attempted to send a write request");
    }
    await route.continue();
  });
});

test("Sport records a sample score and changes the rankings", async ({
  page,
}) => {
  await page.goto("/demo/met-sport");
  const rankings = page
    .getByRole("heading", { name: /ตารางคะแนนทีมสี/ })
    .locator("..");
  const before = await rankings.innerText();
  await page.getByLabel("คะแนนสีฟ้า").fill("2");
  await page.getByRole("button", { name: "บันทึกผลตัวอย่าง" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: /ตารางคะแนนอัปเดต/ }),
  ).toBeVisible();
  await expect(rankings).not.toHaveText(before);
});

test("Attendance updates the sample report and exports CSV", async ({
  page,
}) => {
  await page.goto("/demo/met-attendance");
  await page.getByLabel("สถานะของ ธารา").selectOption("absent");
  await expect(
    page.getByRole("status").filter({ hasText: /บันทึกสถานะ ขาด/ }),
  ).toBeVisible();
  await expect(page.getByText("ขาด 3 · สาย 0")).toBeVisible();
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "ดาวน์โหลด CSV" }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/\.csv$/);
});

test("Admission uses a fixed mock identity, reviews an application, and publishes a result", async ({
  page,
}) => {
  await page.goto("/demo/met-admission");
  await page
    .getByRole("button", { name: "สมัครเรียน", exact: true })
    .first()
    .click();
  await expect(page.getByLabel("ชื่อ-นามสกุลนักเรียน")).toHaveAttribute(
    "readonly",
    "",
  );
  await page.getByRole("button", { name: /ส่งใบสมัครตัวอย่าง/ }).click();
  await expect(
    page.getByRole("status").filter({ hasText: /DEMO-2570-0001/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: "ตรวจใบสมัคร", exact: true }).click();
  await page.getByRole("button", { name: "อนุมัติ", exact: true }).click();
  await page.getByRole("button", { name: "รอบรับสมัคร", exact: true }).click();
  await page.getByLabel("ประกาศผลการคัดเลือก").check();
  await page.getByRole("button", { name: "ตรวจสอบผล", exact: true }).click();
  await expect(page.locator(".workspace main .status").last()).toHaveText(
    "อนุมัติ",
  );
});

test("School Pro only publishes and removes mock news in the browser", async ({
  page,
}) => {
  await page.goto("/demo/met-school-pro");
  await page.getByText("ทดลองจัดการข่าว", { exact: false }).click();
  await page.getByRole("button", { name: "เผยแพร่ข่าวตัวอย่าง" }).click();
  const news = page.getByRole("heading", {
    name: "ประกาศกำหนดการรายงานตัว (ข้อมูลสมมติ)",
  });
  await expect(news).toBeVisible();
  await page.getByRole("button", { name: "นำข่าวล่าสุดออก" }).click();
  await expect(news).toHaveCount(0);
});

test("futsal standings reflect winning team, not number of goals; medal totals respond", async ({
  page,
}) => {
  await page.goto("/demo/met-sport");
  const rankings = page.locator(".sport-rankings");
  const green = rankings.getByRole("listitem").filter({ hasText: "สีเขียว" });
  await expect(green).toContainText("18 คะแนน");
  await page.getByRole("button", { name: /ฟุตซอล/ }).click();
  await page.getByLabel("คะแนนสีเขียว").fill("3");
  await page.getByLabel("คะแนนสีฟ้า").fill("2");
  await page.getByRole("button", { name: "บันทึกผลตัวอย่าง" }).click();
  await expect(green).toContainText("21 คะแนน");
  await page.getByLabel("คะแนนสีเขียว").fill("4");
  await page.getByRole("button", { name: "บันทึกผลตัวอย่าง" }).click();
  await expect(green).toContainText("21 คะแนน");
  await expect(
    page.getByRole("status").filter({ hasText: "คะแนนสะสมจึงเท่าเดิม" }),
  ).toBeVisible();
  const medalButton = page.getByRole("button", {
    name: "เพิ่มเหรียญทองแดงให้ทีมสีเขียว",
  });
  const medalValue = medalButton.locator("..").locator("span").first();
  await expect(medalValue).toHaveText("2");
  await medalButton.click();
  await expect(medalValue).toHaveText("3");
});

test("simulated QR raises both checked and present counters without sending LINE", async ({
  page,
}) => {
  await page.goto("/demo/met-attendance");
  const count = page
    .getByText("เช็กแล้วในรอบนี้", { exact: true })
    .locator("..")
    .locator("dd");
  const present = page
    .locator("dt")
    .filter({ hasText: /^มาเรียน$/ })
    .locator("..")
    .locator("dd");
  await expect(count).toHaveText("0 / 6");
  await expect(present).toHaveText("0");
  await page.getByRole("button", { name: "จำลองสแกน QR" }).click();
  await expect(count).toHaveText("1 / 6");
  await expect(present).toHaveText("1");
  await expect(
    page.getByText("LINE · ตัวอย่างการแจ้งเตือน (ไม่ได้ส่งจริง)"),
  ).toBeVisible();
  await page.getByRole("button", { name: "จำลองสแกน QR" }).click();
  await expect(count).toHaveText("1 / 6");
});

test("Vote changes demo totals once per tab and does not offer a real order", async ({
  page,
}) => {
  await page.goto("/demo/met-vote");
  const chart = page
    .getByRole("heading", { name: /กราฟคะแนนตัวอย่าง/ })
    .locator("..");
  const original = await chart.getByText(/คะแนนรวม/).innerText();
  await page.getByRole("radio").first().check();
  await page.getByRole("button", { name: "ยืนยันลงคะแนนตัวอย่าง" }).click();
  await expect(chart.getByText(/คะแนนรวม/)).not.toHaveText(original);
  await expect(page.getByRole("radio").last()).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "ลงคะแนนตัวอย่างแล้ว" }),
  ).toBeDisabled();
  await page.reload();
  await expect(page.getByRole("radio").last()).toBeDisabled();
  await page.getByRole("button", { name: /เริ่มเดโมใหม่/ }).click();
  await expect(chart.getByText(/คะแนนรวม/)).toHaveText(original);
  await expect(page.locator(".vote-demo a[href^='/contact']")).toHaveCount(0);
});
