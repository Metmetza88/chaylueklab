import Link from "next/link";
import { ProductArt } from "@/components/ProductCard";
import { productDemos } from "@/lib/product-demos";
export default function Page() {
  return (
    <section className="section">
      <span className="eyebrow">TRY BEFORE YOU CHOOSE</span>
      <h1>ทดลองใช้งาน</h1>
      <p className="muted">
        สำรวจขั้นตอนใช้งานด้วยข้อมูลสมมติ ไม่มีการรับข้อมูลเด็กจริงในระบบทดลอง
      </p>
      <div className="info-grid">
        {productDemos.map(({ slug, name, description }) => (
          <article className="product-card" key={slug}>
            <ProductArt slug={slug} />
            <div className="product-content stack">
              <span className="status">Interactive Demo · ข้อมูลสมมติ</span>
              <h2>{name}</h2>
              <p>{description}</p>
              <Link className="btn" href={`/demo/${slug}`}>
                เปิดระบบทดลอง →
              </Link>
              <Link href={`/products/${slug}`}>รายละเอียดโปรแกรม</Link>
            </div>
          </article>
        ))}
      </div>
      <p className="notice">
        เดโมใช้ข้อมูลสมมติในเบราว์เซอร์
        สถานะการเปิดบริการของแต่ละระบบดูได้จากหน้ารายละเอียดโปรแกรม
      </p>
    </section>
  );
}
