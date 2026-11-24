import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { randomUUID, createHmac } from "node:crypto";
import pg from "pg";
const accounts = JSON.parse(readFileSync("tests/local/.accounts.json", "utf8"));
test.beforeEach(({}, testInfo) =>
  test.skip(
    testInfo.project.name !== "Desktop Chromium",
    "Authenticated workflows run once; responsive public flows run on all sizes",
  ),
);
async function login(page: any, user: any) {
  await page.goto("/login");
  await page.getByLabel("อีเมล", { exact: true }).fill(user.email);
  await page.getByLabel("รหัสผ่าน", { exact: true }).fill(user.password);
  await page.getByRole("button", { name: "เข้าสู่ระบบ", exact: true }).click();
  await expect(page).toHaveURL(/\/orders/);
}
test("signup uses real local GoTrue and establishes account session", async ({
  page,
}) => {
  await page.goto("/register");
  await page
    .getByLabel("อีเมล", { exact: true })
    .fill(`registration-${randomUUID()}@example.test`);
  await page.getByLabel("รหัสผ่านอย่างน้อย").fill(`Test-${randomUUID()}!`);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "สมัครสมาชิก", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("อีเมล");
  await page.goto("/orders");
  await expect(
    page.getByRole("heading", { name: "คำสั่งซื้อของฉัน" }),
  ).toBeVisible();
});
test("customer checkout, signed Sandbox webhook, entitlement and receipt", async ({
  page,
  request,
}) => {
  await login(page, accounts.buyer);
  await page.goto("/products/met-admission");
  await page.getByRole("button", { name: "ใส่ตะกร้า", exact: true }).click();
  await page.getByRole("link", { name: /ตะกร้าสินค้า/ }).click();
  await page
    .getByRole("button", { name: "สร้างคำสั่งซื้อ", exact: true })
    .click();
  await expect(page).toHaveURL(/\/orders#/);
  const orderId = new URL(page.url()).hash.slice(1);
  const db = new pg.Client({ connectionString: process.env.TEST_DATABASE_URL });
  await db.connect();
  const order = (
    await db.query(
      "select total_cents,status from public.store_orders where id=$1",
      [orderId],
    )
  ).rows[0];
  expect(order.status).toBe("pending");
  const event = {
    event_id: `e2e-${randomUUID()}`,
    transaction_ref: `e2e-bank-${randomUUID()}`,
    order_id: orderId,
    amount_cents: order.total_cents,
    currency: "THB",
    mode: "sandbox",
    recipient_id: process.env.PAYMENT_RECIPIENT_ID,
    status: "succeeded",
  };
  async function send(body: any, forged = false) {
    const raw = JSON.stringify(body);
    const ts = String(Math.floor(Date.now() / 1000));
    const sig = createHmac("sha256", process.env.PAYMENT_WEBHOOK_SECRET!)
      .update(`${ts}.${raw}`)
      .digest("hex");
    return request.post("/api/payments/webhook", {
      headers: {
        "content-type": "application/json",
        "x-payment-timestamp": ts,
        "x-payment-signature": `sha256=${forged ? "0".repeat(64) : sig}`,
      },
      data: raw,
    });
  }
  expect((await send(event, true)).status()).toBe(401);
  expect(
    (await send({ ...event, amount_cents: order.total_cents - 1 })).status(),
  ).toBe(409);
  expect((await send(event)).status()).toBe(200);
  expect((await send(event)).status()).toBe(200);
  await page.reload();
  await expect(page.locator(`[id="${orderId}"]`)).toContainText("ชำระแล้ว");
  const receipt = await page.request.get(`/api/orders/${orderId}/receipt`);
  expect(receipt.status()).toBe(200);
  expect((await receipt.body()).subarray(0, 5).toString()).toBe("%PDF-");
  await page.goto("/downloads");
  await expect(
    page.getByRole("heading", { name: "MET Admission", exact: true }),
  ).toBeVisible();
  await db.end();
});
test("school applicant submits and officer reviews through protected server actions", async ({
  page,
}) => {
  await login(page, accounts.buyer);
  await page.goto("/schools/local-school/apply");
  await page
    .getByLabel("ชื่อและนามสกุลนักเรียน")
    .fill("นักเรียนทดสอบอัตโนมัติ");
  await page.getByLabel("ชื่อและนามสกุลผู้ปกครอง").fill("ผู้ปกครองสมมติ");
  await page.getByLabel("โทรศัพท์ผู้ปกครอง").fill("0800000001");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "ยืนยันส่งใบสมัคร" }).click();
  await expect(page.getByRole("status")).toContainText("บันทึกใบสมัครแล้ว");
  await page.goto("/schools/local-school/applications");
  await expect(
    page.getByText("นักเรียนทดสอบอัตโนมัติ", { exact: false }),
  ).toBeVisible();
  const pdfLink = page
    .getByRole("link", { name: "ดาวน์โหลดใบสมัคร PDF" })
    .first();
  const response = await page.request.get(
    (await pdfLink.getAttribute("href"))!,
  );
  expect(response.status()).toBe(200);
  await page.getByRole("button", { name: "ออกจากระบบ", exact: true }).click();
  await login(page, accounts.owner);
  await page.goto("/school-admin/local-school");
  const card = page
    .locator("article")
    .filter({ hasText: "นักเรียนทดสอบอัตโนมัติ" });
  await card.getByLabel("ผลตรวจ").selectOption("approved");
  await card.getByLabel("หมายเหตุ").fill("ตรวจข้อมูลสมมติครบถ้วนแล้ว");
  await card.getByRole("button", { name: "บันทึกผลตรวจ" }).click();
  await expect(card.getByRole("status")).toContainText("บันทึกผลตรวจแล้ว");
  const exported = await page.request.get("/api/school/local-school/export");
  expect(exported.status()).toBe(200);
  expect(await exported.text()).toContain("นักเรียนทดสอบอัตโนมัติ");
});
test("cross-school staff cannot view school admin, export or other student PDF", async ({
  page,
}) => {
  await login(page, accounts.attacker);
  expect((await page.goto("/school-admin/local-school"))?.status()).toBe(404);
  expect(
    (await page.request.get("/api/school/local-school/export")).status(),
  ).toBe(403);
  expect(
    (
      await page.request.get(
        `/api/school/applications/${accounts.application}/pdf`,
      )
    ).status(),
  ).toBe(404);
  await page.goto("/schools/local-school/applications");
  await expect(page.getByText("นักเรียนสมมติ เมตศึกษา")).toHaveCount(0);
});
