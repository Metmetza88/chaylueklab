import Link from "next/link";
import { ProductArt } from "@/components/ProductCard";
export default function Page() {
  return (
    <section className="section">
      <span className="eyebrow">TRY BEFORE YOU CHOOSE</span>
      <h1>ทดลองใช้งาน</h1>
      <p className="muted">
        สำรวจขั้นตอนใช้งานด้วยข้อมูลสมมติ ไม่มีการรับข้อมูลเด็กจริงในระบบทดลอง
      </p>
      <div className="info-grid">
        {[
          [
            "met-school-pro",
            "MET School Pro",
            "เว็บไซต์ ข่าวสาร และตั้งค่าโรงเรียน",
          ],
          ["met-admission", "MET Admission", "รับสมัคร ตรวจเอกสาร และติดตามผล"],
        ].map(([slug, name, desc]) => (
          <article className="product-card" key={slug}>
            <ProductArt slug={slug} />
            <div className="product-content stack">
              <span className="status">Interactive Demo · ข้อมูลสมมติ</span>
              <h2>{name}</h2>
              <p>{desc}</p>
              <Link className="btn" href={`/demo/${slug}`}>
                เปิดระบบทดลอง →
              </Link>
              <Link href={`/products/${slug}`}>รายละเอียดโปรแกรม</Link>
            </div>
          </article>
        ))}
      </div>
      <p className="notice">
        Demo แสดงการทำงานฝั่งเบราว์เซอร์โดยไม่บันทึกข้อมูลส่วนบุคคล
        ระบบติดตั้งจริงใช้ Supabase และการตรวจสิทธิ์บน Server สินค้ายัง Coming
        Soon จนผ่านการตรวจรับการติดตั้งและ Workflow ทั้งหมด
      </p>
    </section>
  );
}
