import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { randomUUID, createHmac, createHash } from "node:crypto";
import pg from "pg";
import sharp from "sharp";
import { createClient } from "@supabase/supabase-js";
import { fixtureZip } from "../local/release-fixture.mjs";
const storageEnabled = process.env.TEST_STORAGE_API === "true";
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
  if (storageEnabled) {
    const denied = await page.request.get(`/api/download/${accounts.pid}`, {
      maxRedirects: 0,
    });
    expect(denied.status()).toBe(403);
  }
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
  if (storageEnabled) {
    const response = await page.request.get(`/api/download/${accounts.pid}`, {
      maxRedirects: 0,
    });
    expect(response.status()).toBe(302);
    const target = new URL(response.headers().location);
    expect(target.origin === "http://127.0.0.1:55431").toBe(true);
    const file = await fetch(target).catch(() => {
      throw Error("Private ZIP download failed");
    });
    expect(file.status).toBe(200);
    const bytes = Buffer.from(await file.arrayBuffer());
    expect(bytes.subarray(0, 2).toString()).toBe("PK");
    const release = await db.query(
      "select r.sha256 from public.store_releases r join public.store_products p on p.latest_release_id=r.id where p.id=$1",
      [accounts.pid],
    );
    expect(createHash("sha256").update(bytes).digest("hex")).toBe(
      release.rows[0].sha256,
    );
    await db.query(
      "update public.store_grants set revoked_at=now() where order_id=$1",
      [orderId],
    );
    expect(
      (
        await page.request.get(`/api/download/${accounts.pid}`, {
          maxRedirects: 0,
        })
      ).status(),
    ).toBe(403);
  }
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
  if (storageEnabled) {
    const card = page
      .locator("article")
      .filter({ hasText: "นักเรียนทดสอบอัตโนมัติ" });
    const image = await sharp({
      create: { width: 12, height: 12, channels: 4, background: "#302e70" },
    })
      .png()
      .toBuffer();
    await card.getByLabel("ภาพ PNG/JPEG ไม่เกิน 5 MB").setInputFiles({
      name: "synthetic-document.png",
      mimeType: "image/png",
      buffer: image,
    });
    await card
      .getByRole("button", { name: "อัปโหลดเอกสาร", exact: true })
      .click();
    await expect(card.getByRole("status")).toContainText("อัปโหลด");
    await page.reload();
    const document = card.getByRole("link", { name: /ดูเอกสาร identity/ });
    const response = await page.request.get(
      (await document.getAttribute("href"))!,
      { maxRedirects: 0 },
    );
    expect(response.status()).toBe(302);
    const target = new URL(response.headers().location);
    expect(target.origin === "http://127.0.0.1:55431").toBe(true);
    const file = await fetch(target).catch(() => {
      throw Error("Private school document download failed");
    });
    expect(file.status).toBe(200);
    expect(file.headers.get("content-type")).toContain("image/png");
  }
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
  if (storageEnabled) {
    const db = new pg.Client({
      connectionString: process.env.TEST_DATABASE_URL,
    });
    await db.connect();
    const document = await db.query(
      "select id from public.school_documents where application_id=$1 limit 1",
      [accounts.application],
    );
    expect(document.rows.length).toBe(1);
    expect(
      (
        await page.request.get(`/api/school/documents/${document.rows[0].id}`, {
          maxRedirects: 0,
        })
      ).status(),
    ).toBe(404);
    expect(
      (
        await page.request.get(`/api/download/${accounts.pid}`, {
          maxRedirects: 0,
        })
      ).status(),
    ).toBe(403);
    await db.end();
  }
  await page.goto("/schools/local-school/applications");
  await expect(page.getByText("นักเรียนสมมติ เมตศึกษา")).toHaveCount(0);
});

test("admin ZIP upload rejects secret files and keeps untested replacements inactive", async ({
  page,
}) => {
  test.skip(!storageEnabled, "Requires real Storage API; CI enables it");
  await login(page, accounts.owner);
  await page.goto("/admin");
  const form = page.locator("#releases form").first();
  const version = `0.2.0-e2e${randomUUID().replaceAll("-", "")}`;
  await form.getByLabel("สินค้า", { exact: true }).selectOption(accounts.pid2);
  await form.getByLabel("เวอร์ชัน", { exact: true }).fill(version);
  await form
    .getByLabel("ประวัติการอัปเดต", { exact: true })
    .fill("Synthetic archive upload test only. Not software for sale.");
  const file = form.getByLabel(
    "ZIP ไม่เกิน 7 MB (มี source/database/tests/คู่มือ)",
  );
  await file.setInputFiles({
    name: "unsafe-fixture.zip",
    mimeType: "application/zip",
    buffer: await fixtureZip({
      "fixture/.env.local": "NOT_A_REAL_SECRET=fixture",
    }),
  });
  await form
    .getByRole("button", { name: "อัปโหลด release", exact: true })
    .click();
  await expect(form.getByRole("alert")).toContainText("ZIP ไม่ปลอดภัย");
  const db = new pg.Client({ connectionString: process.env.TEST_DATABASE_URL });
  await db.connect();
  expect(
    (
      await db.query(
        "select count(*)::int n from public.store_releases where version=$1",
        [version],
      )
    ).rows[0].n,
  ).toBe(0);
  const before = (
    await db.query(
      "select latest_release_id from public.store_products where id=$1",
      [accounts.pid2],
    )
  ).rows[0].latest_release_id;
  const bytes = await fixtureZip();
  await file.setInputFiles({
    name: "synthetic-fixture.zip",
    mimeType: "application/zip",
    buffer: bytes,
  });
  await form
    .getByRole("button", { name: "อัปโหลด release", exact: true })
    .click();
  await expect(form.getByRole("status")).toContainText("อัปโหลดแล้ว SHA-256");
  const result = await db.query(
    "select id,tested_at,storage_path,sha256 from public.store_releases where product_id=$1 and version=$2",
    [accounts.pid2, version],
  );
  expect(result.rows.length).toBe(1);
  expect(result.rows[0].tested_at).toBeNull();
  expect(
    (
      await db.query(
        "select latest_release_id from public.store_products where id=$1",
        [accounts.pid2],
      )
    ).rows[0].latest_release_id,
  ).toBe(before);
  const service = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
  const stored = await service.storage
    .from("store-releases")
    .download(result.rows[0].storage_path);
  expect(stored.error === null).toBe(true);
  expect(
    createHash("sha256")
      .update(Buffer.from(await stored.data!.arrayBuffer()))
      .digest("hex"),
  ).toBe(result.rows[0].sha256);
  await db.end();
});
