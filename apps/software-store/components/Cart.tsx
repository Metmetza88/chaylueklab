"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/cart";
import { checkout } from "@/app/actions";
import type { Product } from "@/lib/shop";
export default function Cart({
  products,
  mode,
}: {
  products: Product[];
  mode: string;
}) {
  const { ids, remove, clear } = useCart();
  const [coupon, setCoupon] = useState("");
  const [key] = useState(() => crypto.randomUUID());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const rows = products.filter((p) => ids.includes(p.id));
  async function pay() {
    setBusy(true);
    setError("");
    try {
      const r = await checkout(ids, key, coupon);
      if (r.error) setError(r.error);
      else if (r.id) {
        clear();
        router.push(`/orders#${r.id}`);
      }
    } catch {
      setError("เชื่อมต่อไม่สำเร็จ กรุณาตรวจประวัติคำสั่งซื้อก่อนลองใหม่");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="section">
      <span className="eyebrow">YOUR SOFTWARE TOOLKIT</span>
      <h1>ตะกร้าสินค้า</h1>
      {rows.length === 0 ? (
        <div className="empty panel">
          <p>ตะกร้ายังว่าง เลือกโปรแกรมที่เหมาะกับโรงเรียนของคุณ</p>
          <Link className="btn" href="/products">
            ดูโปรแกรมทั้งหมด →
          </Link>
        </div>
      ) : (
        <div className="info-grid">
          <div className="panel stack">
            {rows.map((p) => (
              <div className="row spaced" key={p.id}>
                <div>
                  <strong>{p.name}</strong>
                  <p className="muted">
                    {p.tagline} · ฿
                    {(p.price_cents / 100).toLocaleString("th-TH")}
                  </p>
                </div>
                <button className="btn ghost" onClick={() => remove(p.id)}>
                  นำออก
                </button>
              </div>
            ))}
          </div>
          <div className="panel stack">
            <h2>สรุปรายการ</h2>
            <p>
              ยอดก่อนส่วนลด ฿
              {(
                rows.reduce((s, p) => s + p.price_cents, 0) / 100
              ).toLocaleString("th-TH")}
            </p>
            <label>
              โค้ดส่วนลด
              <input
                value={coupon}
                onChange={(e) => setCoupon(e.target.value.toUpperCase())}
                maxLength={32}
              />
            </label>
            <p className="muted">
              ระบบคำนวณราคาสุดท้าย คูปอง และสิทธิ์ VIP
              จากฐานข้อมูลอีกครั้งเมื่อสร้างคำสั่งซื้อ
            </p>
            {mode === "sandbox" && (
              <p className="notice">Sandbox เท่านั้น ห้ามโอนเงินจริง</p>
            )}
            {mode === "disabled" ? (
              <p className="notice">ยังไม่เปิดรับคำสั่งซื้อหรือชำระเงิน</p>
            ) : (
              <button className="btn" onClick={pay} disabled={busy}>
                {busy ? "กำลังสร้างคำสั่งซื้อ…" : "สร้างคำสั่งซื้อ"}
              </button>
            )}
            {error && (
              <p role="alert" className="error">
                {error}
              </p>
            )}
            <Link href="/orders">ตรวจประวัติคำสั่งซื้อ →</Link>
          </div>
        </div>
      )}
    </section>
  );
}
