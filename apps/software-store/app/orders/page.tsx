import Link from "next/link";
import { redirect } from "next/navigation";
import { getViewer, baht } from "@/lib/shop";
import { createClient } from "@/lib/supabase/server";
import { paymentMode } from "@/lib/env";
import { promptPayPayload } from "@/lib/promptpay";
import PromptPayQR from "@/components/PromptPayQR";
import ActionForm from "@/components/ActionForm";
import { uploadSlip } from "@/app/actions";
const status: Record<string, string> = {
  pending: "รอชำระเงิน",
  verifying: "รอตรวจสอบ",
  paid: "ชำระแล้ว",
  cancelled: "ยกเลิก",
  rejected: "ไม่ผ่านการตรวจสอบ",
  refunded: "คืนเงินแล้ว",
};
export default async function Orders() {
  const { user } = await getViewer();
  if (!user) redirect("/login?next=/orders");
  const db = await createClient();
  const { data, error } = await db
    .from("store_orders")
    .select("*,store_order_items(*)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  return (
    <section className="section">
      <span className="eyebrow">YOUR ORDERS</span>
      <h1>คำสั่งซื้อของฉัน</h1>
      {error && <p className="error">โหลดประวัติไม่สำเร็จ กรุณาลองใหม่</p>}
      {!error && !data?.length && (
        <div className="empty panel">
          ยังไม่มีคำสั่งซื้อ <Link href="/products">เลือกดูโปรแกรม →</Link>
        </div>
      )}
      {data?.map((o) => (
        <article className="panel order-card" id={o.id} key={o.id}>
          <div className="row spaced">
            <div>
              <span className="eyebrow">
                ORDER #{String(o.order_no).padStart(6, "0")}
              </span>
              <h2>
                {status[o.status]} · {baht(o.total_cents)}
              </h2>
            </div>
            <Link className="btn ghost" href={`/api/orders/${o.id}/receipt`}>
              ใบยืนยันคำสั่งซื้อ
            </Link>
          </div>
          <p className="muted">
            {new Date(o.created_at).toLocaleString("th-TH", {
              timeZone: "Asia/Bangkok",
            })}{" "}
            · {o.mode === "sandbox" ? "SANDBOX · ห้ามโอนเงินจริง" : "PromptPay"}
          </p>
          <div className="order-items">
            {o.store_order_items?.map((i: any) => (
              <div key={i.id}>
                <span>{i.product_name}</span>
                <span>{baht(i.unit_price_cents)}</span>
              </div>
            ))}
          </div>
          <p className="muted">
            ส่วนลด {baht(o.discount_cents)} · ยอดชำระ {baht(o.total_cents)}
          </p>
          {o.status === "paid" && (
            <Link className="btn" href="/downloads">
              ไปที่ดาวน์โหลด →
            </Link>
          )}
          {o.status === "pending" && paymentMode() === o.mode && (
            <>
              {o.mode === "live" && process.env.PROMPTPAY_ID ? (
                <PromptPayQR
                  payload={promptPayPayload(
                    process.env.PROMPTPAY_ID,
                    o.total_cents / 100,
                  )}
                  amount={o.total_cents / 100}
                />
              ) : (
                <p className="notice">คำสั่งซื้อทดสอบ ไม่แสดง QR รับเงินจริง</p>
              )}
              <ActionForm action={uploadSlip} label="ส่งหลักฐานให้ตรวจสอบ">
                <input type="hidden" name="order_id" value={o.id} />
                <label>
                  ภาพสลิป PNG/JPEG ไม่เกิน 5 MB
                  <input
                    name="file"
                    type="file"
                    accept="image/png,image/jpeg"
                    required
                  />
                </label>
              </ActionForm>
            </>
          )}
          {o.rejection_reason && (
            <p className="error">เหตุผล: {o.rejection_reason}</p>
          )}
          {o.status === "verifying" && (
            <p className="notice">
              กำลังรอตรวจสอบยอดเงินจากธนาคาร สิทธิ์ดาวน์โหลดจะเปิดหลังการยืนยัน
            </p>
          )}
        </article>
      ))}
    </section>
  );
}
