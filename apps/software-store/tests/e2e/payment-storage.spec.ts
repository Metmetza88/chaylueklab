import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import pg from "pg";
const accounts = JSON.parse(readFileSync("tests/local/.accounts.json", "utf8"));
test.beforeEach(({}, info) =>
  test.skip(
    info.project.name !== "Desktop Chromium",
    "Mutating Sandbox flow runs once; authenticated admin layout runs on all viewports",
  ),
);
async function login(page: any, user: any) {
  await page.goto("/login");
  await page.getByLabel("อีเมล", { exact: true }).fill(user.email);
  await page.getByLabel("รหัสผ่าน", { exact: true }).fill(user.password);
  await page.getByRole("button", { name: "เข้าสู่ระบบ", exact: true }).click();
  await expect(page).toHaveURL(/\/orders/);
}
test("real slip upload rejects duplicates, wrong amounts and unauthorized reads before manual Sandbox confirmation", async ({
  page,
}) => {
  test.skip(
    process.env.TEST_STORAGE_API !== "true",
    "Requires real Storage API; CI enables it",
  );
  const service = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
  const buyer = accounts.slipBuyer;
  const orders: string[] = [];
  for (let i = 0; i < 2; i++) {
    const result = await service.rpc("store_create_order", {
      p_user: buyer.id,
      p_ids: [accounts.pid],
      p_key: randomUUID(),
      p_coupon: "",
      p_mode: "sandbox",
    });
    expect(result.error === null).toBe(true);
    orders.push(result.data);
  }
  const db = new pg.Client({ connectionString: process.env.TEST_DATABASE_URL });
  await db.connect();
  const amount = (
    await db.query("select total_cents from public.store_orders where id=$1", [
      orders[0],
    ])
  ).rows[0].total_cents;
  const image = await sharp({
    create: { width: 16, height: 16, channels: 4, background: "#207368" },
  })
    .png()
    .toBuffer();
  await login(page, buyer);
  await page.goto("/orders");
  const first = page.locator(`article[id="${orders[0]}"]`);
  await first
    .getByLabel("ภาพสลิป PNG/JPEG ไม่เกิน 5 MB")
    .setInputFiles({
      name: "synthetic-slip.png",
      mimeType: "image/png",
      buffer: image,
    });
  await first
    .getByRole("button", { name: "ส่งหลักฐานให้ตรวจสอบ", exact: true })
    .click();
  await expect(first).toContainText("กำลังรอตรวจสอบยอดเงินจากธนาคาร");
  expect(
    (
      await page.request.get(`/api/admin/slips/${orders[0]}`, {
        maxRedirects: 0,
      })
    ).status(),
  ).toBe(403);
  const second = page.locator(`article[id="${orders[1]}"]`);
  await second
    .getByLabel("ภาพสลิป PNG/JPEG ไม่เกิน 5 MB")
    .setInputFiles({
      name: "duplicate-slip.png",
      mimeType: "image/png",
      buffer: image,
    });
  await second
    .getByRole("button", { name: "ส่งหลักฐานให้ตรวจสอบ", exact: true })
    .click();
  await expect(second.getByRole("alert")).toContainText("สลิปนี้ถูกใช้แล้ว");
  expect(
    (
      await db.query("select status from public.store_orders where id=$1", [
        orders[1],
      ])
    ).rows[0].status,
  ).toBe("pending");
  expect(
    (
      await db.query(
        "select count(*)::int n from public.store_slips where order_id=$1",
        [orders[1]],
      )
    ).rows[0].n,
  ).toBe(0);
  const leftover = await service.storage
    .from("store-slips")
    .list(`${buyer.id}/${orders[1]}`);
  expect(leftover.error === null).toBe(true);
  expect(leftover.data).toHaveLength(0);
  await page.getByRole("button", { name: "ออกจากระบบ", exact: true }).click();
  await login(page, accounts.layoutOwner);
  await page.goto("/admin");
  const order = page.locator("#orders article").filter({ hasText: orders[0] });
  const slip = await page.request.get(`/api/admin/slips/${orders[0]}`, {
    maxRedirects: 0,
  });
  expect(slip.status()).toBe(302);
  const target = new URL(slip.headers().location);
  expect(target.origin === "http://127.0.0.1:55431").toBe(true);
  const stored = await fetch(target).catch(() => {
    throw Error("Private slip download failed");
  });
  expect(stored.status).toBe(200);
  expect(stored.headers.get("content-type")).toContain("image/png");
  const form = order.locator("form").first();
  await form
    .getByLabel("เลขอ้างอิงธุรกรรมจากธนาคาร")
    .fill(`manual-sandbox-${randomUUID()}`);
  await form.getByLabel("ยอดรับจริง หน่วยสตางค์").fill(String(amount - 1));
  await form.locator('input[name="bank_verified"]').check();
  await form
    .getByRole("button", { name: "ยืนยันยอดและเปิดสิทธิ์", exact: true })
    .click();
  await expect(form.getByRole("alert")).toContainText("ไม่สามารถยืนยันได้");
  expect(
    (
      await db.query("select status from public.store_orders where id=$1", [
        orders[0],
      ])
    ).rows[0].status,
  ).toBe("verifying");
  expect(
    (
      await db.query(
        "select count(*)::int n from public.store_grants where order_id=$1",
        [orders[0]],
      )
    ).rows[0].n,
  ).toBe(0);
  await form.getByLabel("ยอดรับจริง หน่วยสตางค์").fill(String(amount));
  await form
    .getByRole("button", { name: "ยืนยันยอดและเปิดสิทธิ์", exact: true })
    .click();
  await expect(order).toContainText("sandbox / paid");
  expect(
    (
      await db.query(
        "select count(*)::int n from public.store_grants where order_id=$1 and revoked_at is null",
        [orders[0]],
      )
    ).rows[0].n,
  ).toBe(1);
  await page.getByRole("button", { name: "ออกจากระบบ", exact: true }).click();
  await login(page, buyer);
  expect(
    (
      await page.request.get(`/api/download/${accounts.pid}`, {
        maxRedirects: 0,
      })
    ).status(),
  ).toBe(302);
  await db.end();
});
