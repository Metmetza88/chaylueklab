import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getViewer, requireAdmin, baht } from "@/lib/shop";
import { paymentMode } from "@/lib/env";
import ActionForm from "@/components/ActionForm";
import {
  verifyManualPayment,
  refundOrder,
  saveProduct,
  saveCoupon,
  replySupport,
  setVip,
  rejectOrder,
  revokeGrant,
} from "@/app/actions";
import { uploadRelease, attestRelease, provisionSchool } from "./actions";
export default async function Admin() {
  const v = await getViewer();
  if (!v.user) redirect("/login?next=/admin");
  if (!v.isAdmin) notFound();
  const { db } = await requireAdmin();
  const results = await Promise.all([
    db.rpc("store_dashboard"),
    db
      .from("store_orders")
      .select("*,store_order_items(product_name)")
      .order("created_at", { ascending: false })
      .limit(100),
    db.from("store_products").select("*").order("slug"),
    db
      .from("store_releases")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50),
    db
      .from("store_profiles")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100),
    db
      .from("store_support")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50),
    db
      .from("store_audit")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100),
    db.from("store_grants").select("*").order("id").limit(100),
    db
      .from("store_outbox")
      .select("id,topic,delivered_at,attempts")
      .order("created_at", { ascending: false })
      .limit(50),
  ]);
  const [
    dashboard,
    orders,
    products,
    releases,
    members,
    tickets,
    audit,
    grants,
    outbox,
  ] = results;
  const stats = dashboard.data ?? {};
  return (
    <section className="section">
      <div className="row spaced">
        <div>
          <span className="eyebrow">WORAMET / OWNER WORKSPACE</span>
          <h1>ภาพรวมร้านค้า</h1>
        </div>
        <span className="status">Payment: {paymentMode()}</span>
      </div>
      <p className="muted">
        รายได้จากคำสั่งซื้อเงินจริงที่ชำระแล้ว ไม่รวม Sandbox หรือคืนเงิน ·
        เวลาไทย
      </p>
      {results.some((r) => r.error) && (
        <p className="error">
          ข้อมูลบางส่วนโหลดไม่สำเร็จ อย่าตีความเป็นยอดศูนย์ กรุณาตรวจฐานข้อมูล
        </p>
      )}
      <div className="stats-grid">
        {[
          ["รายได้วันนี้", stats.today_cents],
          ["รายได้เดือนนี้", stats.month_cents],
          ["รายได้สะสม", stats.total_cents],
          ["รอตรวจสอบ", stats.pending],
        ].map(([l, n], i) => (
          <div className="stat-card" key={l}>
            <span>{l}</span>
            <strong>
              {typeof n === "number" ? (i === 3 ? n : baht(n)) : "—"}
            </strong>
          </div>
        ))}
      </div>
      <nav className="admin-nav">
        {[
          ["orders", "คำสั่งซื้อ"],
          ["products", "สินค้า"],
          ["releases", "ไฟล์ / เวอร์ชัน"],
          ["members", "สมาชิก"],
          ["support", "ช่วยเหลือ"],
          ["coupons", "คูปอง"],
          ["schools", "โรงเรียน"],
          ["audit", "Audit Log"],
        ].map(([h, l]) => (
          <a key={h} href={`#${h}`}>
            {l}
          </a>
        ))}
        <a href="/api/admin/report">รายงาน CSV</a>
      </nav>
      <section id="orders" className="admin-section">
        <h2>คำสั่งซื้อล่าสุด</h2>
        <p className="muted">
          แสดง 100 รายการล่าสุด ยอดรวมคำนวณจากข้อมูลทั้งหมดในฐานข้อมูล
        </p>
        {orders.data?.map((o) => (
          <article className="panel stack" key={o.id}>
            <div className="row spaced">
              <strong>
                #{o.order_no} · {baht(o.total_cents)}
              </strong>
              <span className="status">
                {o.mode} / {o.status}
              </span>
            </div>
            <code>{o.id}</code>
            <p className="muted">
              ผู้ซื้อ {o.user_id} ·{" "}
              {o.store_order_items?.map((i: any) => i.product_name).join(", ")}
            </p>
            {o.status === "verifying" && (
              <a
                className="btn ghost"
                href={`/api/admin/slips/${o.id}`}
                target="_blank"
                rel="noopener"
              >
                ดูหลักฐาน (ลิงก์ 60 วินาที) ↗
              </a>
            )}
            {["pending", "verifying"].includes(o.status) && (
              <ActionForm
                action={verifyManualPayment}
                label="ยืนยันยอดและเปิดสิทธิ์"
              >
                <input type="hidden" name="id" value={o.id} />
                <div className="form-grid">
                  <label>
                    เลขอ้างอิงธุรกรรมจากธนาคาร
                    <input
                      name="reference"
                      required
                      minLength={6}
                      maxLength={150}
                    />
                  </label>
                  <label>
                    ยอดรับจริง หน่วยสตางค์
                    <input
                      type="number"
                      name="amount_cents"
                      min={1}
                      required
                      placeholder="เช่น 350000 = 3,500 บาท"
                    />
                  </label>
                </div>
                <label className="check">
                  <input type="checkbox" name="bank_verified" required />
                  ตรวจสอบยอดเข้าบัญชีและผู้รับจากธนาคารจริงแล้ว (Sandbox
                  ใช้รายการทดสอบ)
                </label>
              </ActionForm>
            )}
            {["pending", "verifying"].includes(o.status) && (
              <ActionForm action={rejectOrder} label="ปฏิเสธหลักฐาน">
                <input name="id" type="hidden" value={o.id} />
                <label>
                  เหตุผล
                  <textarea
                    name="reason"
                    minLength={3}
                    maxLength={2000}
                    required
                  />
                </label>
              </ActionForm>
            )}
            {o.status === "paid" && (
              <ActionForm
                action={refundOrder}
                label="บันทึกคืนเงิน / ถอนสิทธิ์"
              >
                <input type="hidden" name="id" value={o.id} />
                <label className="check">
                  <input type="checkbox" name="confirmed" required />
                  คืนเงินให้ลูกค้านอกระบบแล้ว การบันทึกนี้ไม่โอนเงินอัตโนมัติ
                </label>
              </ActionForm>
            )}
          </article>
        ))}
      </section>
      <section id="products" className="admin-section">
        <h2>จัดการสินค้า</h2>
        <details className="panel">
          <summary>เพิ่มสินค้าใหม่</summary>
          <ProductForm />
        </details>
        {products.data?.map((p) => (
          <details key={p.id} className="panel">
            <summary>
              {p.name} · {p.status} · {baht(p.price_cents)}
            </summary>
            <ProductForm p={p} />
          </details>
        ))}
      </section>
      <section id="releases" className="admin-section">
        <h2>อัปโหลด ZIP และจัดการเวอร์ชัน</h2>
        <div className="panel">
          <ActionForm action={uploadRelease} label="อัปโหลด release">
            <div className="form-grid">
              <label>
                สินค้า
                <select name="product_id" required>
                  {products.data?.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                เวอร์ชัน
                <input
                  name="version"
                  placeholder="0.2.0"
                  pattern="[0-9]+\.[0-9]+\.[0-9]+(-[a-z0-9.]+)?"
                  required
                />
              </label>
              <label className="span-full">
                ประวัติการอัปเดต
                <textarea name="changelog" minLength={20} required />
              </label>
              <label className="span-full">
                ZIP ไม่เกิน 7 MB (มี source/database/tests/คู่มือ)
                <input name="file" type="file" accept=".zip" required />
              </label>
            </div>
          </ActionForm>
        </div>
        {releases.data?.map((r) => (
          <details className="panel" key={r.id}>
            <summary>
              v{r.version} ·{" "}
              {r.tested_at ? "ตรวจรับผลทดสอบแล้ว" : "ยังไม่ตรวจรับ"}
            </summary>
            <p>
              <code>{r.id}</code>
            </p>
            <p>
              <code>SHA-256: {r.sha256}</code>
            </p>
            <p>{r.changelog}</p>
            <ActionForm action={attestRelease} label="บันทึกการตรวจรับ">
              <input type="hidden" name="release_id" value={r.id} />
              <label>
                ยืนยัน SHA-256 ของ ZIP ที่ทดสอบ
                <input name="sha256" required pattern="[a-f0-9]{64}" />
              </label>
              <label>
                หลักฐานผลทดสอบ / CI URL
                <textarea name="evidence" required minLength={30} />
              </label>
              <label className="check">
                <input type="checkbox" name="reviewed" required />
                ตรวจผลทดสอบ Source, Auth, RLS, Payment
                และอุปกรณ์จริงของเวอร์ชันนี้แล้ว
              </label>
            </ActionForm>
          </details>
        ))}
      </section>
      <section id="members" className="admin-section">
        <h2>สมาชิกและสิทธิ์ VIP</h2>
        <div className="panel table-wrap">
          <table>
            <thead>
              <tr>
                <th>บัญชี UUID</th>
                <th>VIP ถึง</th>
                <th>บทบาท</th>
              </tr>
            </thead>
            <tbody>
              {members.data?.map((m) => (
                <tr key={m.id}>
                  <td>
                    <code>{m.id}</code>
                  </td>
                  <td>{m.vip_until ?? "—"}</td>
                  <td>{m.is_admin ? "Admin" : "Customer"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="panel">
          <ActionForm action={setVip}>
            <label>
              UUID สมาชิก
              <input name="user_id" required />
            </label>
            <label>
              วันหมดอายุ VIP เวลาไทย (ว่าง = ยกเลิก)
              <input type="datetime-local" name="vip_until" />
            </label>
            <label>
              เหตุผล
              <input name="reason" required maxLength={200} />
            </label>
          </ActionForm>
        </div>
      </section>
      <section className="admin-section">
        <h2>สิทธิ์ดาวน์โหลด</h2>
        {grants.data?.map((g) => (
          <details className="panel" key={g.id}>
            <summary>
              {g.user_id} · {g.revoked_at ? "ถอนสิทธิ์แล้ว" : "ใช้งานได้"}
            </summary>
            <p className="muted">
              สินค้า {g.product_id} · ดาวน์โหลด {g.download_count} ครั้ง
            </p>
            {!g.revoked_at && (
              <ActionForm action={revokeGrant} label="ถอนสิทธิ์ดาวน์โหลด">
                <input name="id" type="hidden" value={g.id} />
                <label>
                  เหตุผล
                  <input name="reason" minLength={3} maxLength={200} required />
                </label>
              </ActionForm>
            )}
          </details>
        ))}
      </section>
      <section id="support" className="admin-section">
        <h2>คำขอช่วยเหลือ</h2>
        {tickets.data?.map((t) => (
          <article className="panel" key={t.id}>
            <span className="status">{t.status}</span>
            <h3>{t.subject}</h3>
            <p style={{ whiteSpace: "pre-wrap" }}>{t.message}</p>
            <ActionForm action={replySupport}>
              <input type="hidden" name="id" value={t.id} />
              <label>
                คำตอบ
                <textarea
                  name="reply"
                  defaultValue={t.reply ?? ""}
                  minLength={3}
                  maxLength={5000}
                  required
                />
              </label>
              <label>
                สถานะ
                <select name="status" defaultValue={t.status}>
                  <option value="open">เปิด</option>
                  <option value="in_progress">กำลังดำเนินการ</option>
                  <option value="resolved">แก้ไขแล้ว</option>
                </select>
              </label>
            </ActionForm>
          </article>
        ))}
      </section>
      <section id="coupons" className="admin-section">
        <h2>สร้างคูปอง</h2>
        <div className="panel">
          <ActionForm action={saveCoupon}>
            <div className="form-grid">
              <label>
                รหัส
                <input name="code" pattern="[A-Za-z0-9_-]{3,32}" required />
              </label>
              <label>
                ส่วนลด %
                <input
                  name="percent"
                  type="number"
                  min={1}
                  max={100}
                  required
                />
              </label>
              <label>
                จำนวนครั้งสูงสุด
                <input name="max_uses" type="number" min={1} required />
              </label>
              <label>
                หมดอายุ เวลาไทย
                <input name="expires_at" type="datetime-local" required />
              </label>
            </div>
          </ActionForm>
        </div>
      </section>
      <section id="schools" className="admin-section">
        <h2>สร้างพื้นที่โรงเรียน</h2>
        <p className="muted">
          เพิ่มเจ้าของด้วย UUID ของบัญชีที่สมัครและยืนยันอีเมลแล้ว
          ไม่มีการเปิดสิทธิ์จากอีเมลที่กรอกเอง
        </p>
        <div className="panel">
          <ActionForm action={provisionSchool}>
            <label>
              ชื่อโรงเรียน
              <input name="name" required minLength={3} />
            </label>
            <label>
              Slug ภาษาอังกฤษ
              <input name="slug" pattern="[a-z0-9-]{3,60}" required />
            </label>
            <label>
              UUID บัญชีเจ้าของโรงเรียน
              <input name="owner_id" required />
            </label>
          </ActionForm>
        </div>
      </section>
      <section id="audit" className="admin-section">
        <h2>Audit Log</h2>
        <div className="panel table-wrap">
          <table>
            <thead>
              <tr>
                <th>เวลา UTC</th>
                <th>เหตุการณ์</th>
                <th>เป้าหมาย</th>
              </tr>
            </thead>
            <tbody>
              {audit.data?.map((a) => (
                <tr key={a.id}>
                  <td>{a.created_at}</td>
                  <td>{a.action}</td>
                  <td>
                    <code>{a.target_id}</code>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <h2>คิวระบบอัตโนมัติ</h2>
        <p className="muted">
          ยังไม่ส่งจนตั้งค่าปลายทางที่ได้รับอนุญาต รายการแสดงผลการส่งจริง
        </p>
        <div className="panel table-wrap">
          <table>
            <thead>
              <tr>
                <th>เหตุการณ์</th>
                <th>พยายามส่ง</th>
                <th>ส่งสำเร็จเมื่อ</th>
              </tr>
            </thead>
            <tbody>
              {outbox.data?.map((o) => (
                <tr key={o.id}>
                  <td>{o.topic}</td>
                  <td>{o.attempts}</td>
                  <td>{o.delivered_at ?? "ยังไม่ส่ง"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <Link href="/guide">คู่มือผู้ดูแลผ่าน iPhone →</Link>
    </section>
  );
}
function ProductForm({ p }: { p?: any }) {
  return (
    <ActionForm action={saveProduct}>
      <input type="hidden" name="id" value={p?.id ?? ""} />
      <div className="form-grid">
        {[
          ["slug", "Slug"],
          ["name", "ชื่อโปรแกรม"],
          ["tagline", "คำอธิบายสั้น"],
          ["category", "หมวดหมู่"],
        ].map(([k, l]) => (
          <label key={k}>
            {l}
            <input name={k} defaultValue={p?.[k] ?? ""} required />
          </label>
        ))}
        <label>
          ราคา (สตางค์)
          <input
            name="price_cents"
            type="number"
            defaultValue={p?.price_cents ?? 0}
            min={0}
            required
          />
        </label>
        <label>
          สถานะ
          <select name="status" defaultValue={p?.status ?? "coming_soon"}>
            <option value="coming_soon">รอตรวจรับความพร้อม</option>
            <option value="ready">
              พร้อมจำหน่าย (ต้องมี release ที่ทดสอบแล้ว)
            </option>
            <option value="archived">ซ่อน</option>
          </select>
        </label>
        <label className="check">
          <input type="checkbox" name="vip_free" defaultChecked={p?.vip_free} />
          สินค้าเข้าร่วม VIP
        </label>
        <label className="span-full">
          รายละเอียด
          <textarea
            name="description"
            defaultValue={p?.description ?? ""}
            maxLength={5000}
          />
        </label>
      </div>
    </ActionForm>
  );
}
