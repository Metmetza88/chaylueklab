import { redirect } from "next/navigation";
import Link from "next/link";
import { getViewer } from "@/lib/shop";
import { createClient } from "@/lib/supabase/server";
export default async function Page() {
  const { user, isVip } = await getViewer();
  if (!user) redirect("/login?next=/downloads");
  const db = await createClient();
  const [{ data: grants, error }, { data: products }] = await Promise.all([
    db
      .from("store_grants")
      .select("product_id")
      .eq("user_id", user.id)
      .is("revoked_at", null),
    db
      .from("store_products")
      .select("id,name,slug,status,vip_free")
      .eq("status", "ready"),
  ]);
  const ids = new Set(grants?.map((x) => x.product_id));
  const rows =
    products?.filter((p) => ids.has(p.id) || (isVip && p.vip_free)) ?? [];
  return (
    <section className="section">
      <span className="eyebrow">YOUR SOFTWARE LIBRARY</span>
      <h1>ดาวน์โหลดโปรแกรม</h1>
      <p className="muted">
        ลิงก์ดาวน์โหลดเป็นส่วนตัว มีอายุ 60 วินาที
        กรุณาเก็บไฟล์และคู่มือไว้ในที่ปลอดภัย
      </p>
      {error && <p className="error">โหลดสิทธิ์ไม่สำเร็จ</p>}
      {!rows.length && (
        <div className="panel empty">
          ยังไม่มีโปรแกรมที่ดาวน์โหลดได้{" "}
          <Link href="/orders">ดูคำสั่งซื้อ →</Link>
        </div>
      )}
      <div className="product-grid">
        {rows.map((p) => (
          <article className="panel stack" key={p.id}>
            <h2>{p.name}</h2>
            <Link href={`/products/${p.slug}`}>รายละเอียดและสิทธิ์ใช้งาน</Link>
            <a className="btn" href={`/api/download/${p.id}`}>
              ดาวน์โหลด ZIP
            </a>
          </article>
        ))}
      </div>
    </section>
  );
}
