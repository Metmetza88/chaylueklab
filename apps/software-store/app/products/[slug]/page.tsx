import { notFound } from "next/navigation";
import Link from "next/link";
import { Check, ArrowUpRight } from "lucide-react";
import AddToCart from "@/components/AddToCart";
import { ProductArt } from "@/components/ProductCard";
import { getProducts, baht } from "@/lib/shop";
import { paymentMode } from "@/lib/env";
import ProductGallery from "@/components/ProductGallery";
import MiniDashboard from "@/components/MiniDashboard";
import { displayStatus, hasLocalDemo } from "@/lib/procurement";

const screenshots: Record<string, { file: string; label: string }[]> = {
  "met-school-pro": [
    { file: "met-school-pro-site.png", label: "เว็บไซต์โรงเรียนตัวอย่าง" },
    { file: "met-school-pro-actual-site-local.png", label: "เว็บไซต์บนมือถือ" },
  ],
  "met-admission": [
    { file: "met-admission-dashboard.png", label: "ภาพรวมงานรับสมัคร" },
    { file: "met-admission-iphone-layout.png", label: "รับสมัครบนมือถือ" },
    { file: "met-admission-pdf.png", label: "ใบสมัคร PDF ตัวอย่าง" },
  ],
};
export default async function Product({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { products } = await getProducts();
  const p = products.find((x) => x.slug === slug);
  if (!p) notFound();
  const hasDemo = hasLocalDemo(slug);
  const images = screenshots[slug];
  return (
    <section className="section">
      <div className="breadcrumbs">
        <Link href="/products">โปรแกรมทั้งหมด</Link> / {p.name}
      </div>
      <div className="product-detail">
        <div>
          {images ? (
            <ProductGallery images={images} />
          ) : (
            <>
              <div className="market-preview detail-mock">
                <MiniDashboard slug={slug} name={p.name} />
              </div>
              <ProductArt slug={slug} large />
            </>
          )}
        </div>
        <div className="stack">
          <span className="eyebrow">{p.category}</span>
          <h1>{p.name}</h1>
          <h2>{p.tagline}</h2>
          <p className="muted">{p.description}</p>
          <span className="status">{displayStatus(p.status, hasDemo)}</span>
          <div className="detail-price">
            {baht(p.price_cents)}
            <small>
              {p.status === "ready"
                ? "ราคาสินค้า"
                : "ราคาเป้าหมาย อาจเปลี่ยนแปลงก่อนเปิดขาย"}
            </small>
          </div>
          {p.status === "ready" && paymentMode() !== "disabled" ? (
            <AddToCart id={p.id} />
          ) : (
            <p className="notice">ยังไม่รับชำระเงินสำหรับสินค้านี้</p>
          )}
          <ul className="feature-list">
            {p.features.map((f) => (
              <li key={f}>
                <Check size={17} />
                {f}
              </li>
            ))}
          </ul>
          {hasDemo && (
            <Link className="btn ghost" href={`/demo/${slug}`}>
              เปิดระบบทดลอง <ArrowUpRight size={18} />
            </Link>
          )}
          <Link href="/contact">สอบถามเกี่ยวกับโปรแกรมนี้ →</Link>
        </div>
      </div>
      <div className="info-grid">
        <section className="panel">
          <h2>สิ่งที่ได้รับเมื่อเปิดจำหน่าย</h2>
          <p>
            Source Code, ฐานข้อมูล, ระบบผู้ดูแล, คู่มือติดตั้งและใช้งานภาษาไทย,
            ไฟล์ ZIP พร้อมเวอร์ชันและประวัติอัปเดต
          </p>
          <p className="muted">
            จะระบุเวอร์ชันพร้อมขายเมื่อทดสอบและผ่านการตรวจรับ release
            แล้วเท่านั้น
          </p>
        </section>
        <section className="panel">
          <h2>สิทธิ์การใช้งาน</h2>
          <p>
            ใช้ภายในหนึ่งโรงเรียนหรือหนึ่งองค์กร ปรับแต่งโค้ดเพื่อใช้งานภายในได้
            ห้ามจำหน่ายต่อหรือแจกจ่าย Source Code ให้บุคคลภายนอก
          </p>
          <Link href="/terms">อ่านเงื่อนไขฉบับเต็ม →</Link>
        </section>
      </div>
    </section>
  );
}
