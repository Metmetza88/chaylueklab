import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  ArrowUpRight,
  Code2,
  ShieldCheck,
  MonitorSmartphone,
  Trophy,
} from "lucide-react";
import { getProducts } from "@/lib/shop";
import ProductCard from "@/components/ProductCard";
import HomeStats from "@/components/HomeStats";
import HomeFeatures from "@/components/HomeFeatures";
import HomeFAQ from "@/components/HomeFAQ";
import { schoolOffers } from "@/lib/school-offers";
import SchoolPackage from "@/components/SchoolPackage";
import { productDemos } from "@/lib/product-demos";
export default async function Home() {
  if (process.env.APP_VARIANT === "school")
    redirect(`/schools/${process.env.SCHOOL_SLUG ?? "my-school"}`);
  const { products: catalog, source } = await getProducts();
  const products = source === "error" ? [] : schoolOffers(catalog);
  return (
    <>
      <section
        className="school-store-hero"
        aria-labelledby="school-store-title"
      >
        <div className="school-store-copy">
          <span className="school-store-kicker">
            WORAMET AI LAB <span /> ซอฟต์แวร์เพื่อการศึกษา
          </span>
          <h1 id="school-store-title">
            ระบบโรงเรียน
            <br />
            ลองก่อนเลือก
          </h1>
          <p>
            รับสมัคร เช็กชื่อ ทำเว็บโรงเรียน และจัดกีฬาสี
            ลองทำงานจริงในเดโมด้วยข้อมูลสมมติ
          </p>
          <div className="school-store-actions">
            <Link className="btn" href="/products">
              ดูระบบทั้งหมด <ArrowRight size={17} />
            </Link>
            <Link className="btn ghost" href="/demo">
              ทดลองใช้งาน <ArrowUpRight size={16} />
            </Link>
          </div>
          <Link
            className="school-store-procurement"
            href="/school-systems#procurement"
          >
            <ShieldCheck size={16} /> วางระบบและขอเอกสารจัดซื้อ
          </Link>
        </div>
        <figure className="school-store-proof">
          <figcaption>
            <span className="school-store-proof-icon">
              <Trophy size={20} aria-hidden="true" />
            </span>
            <span>
              <strong>MET Sport</strong>
              <small>ตารางแข่งขันและคะแนนทีมสี</small>
            </span>
            <span className="school-store-live-label">หน้าจอเดโม</span>
          </figcaption>
          <Link
            href="/demo/met-sport"
            className="school-store-screen"
            aria-label="ทดลองเดโม MET Sport"
          >
            <Image
              src="/screenshots/demos/met-sport-results.webp"
              alt="หน้าจอเดโม MET Sport หลังบันทึกผลตัวอย่าง มีตารางแข่งขันและคะแนนสะสมทีมสี"
              width={1200}
              height={354}
              sizes="(max-width: 840px) 92vw, 55vw"
              priority
              unoptimized
            />
          </Link>
          <div className="school-store-proof-foot">
            <span>ข้อมูลสมมติ</span>
            <Link href="/demo/met-sport">
              ลองบันทึกผลแข่ง <ArrowUpRight size={15} />
            </Link>
          </div>
        </figure>
      </section>
      <section className="section school-store-featured">
        <div className="section-heading">
          <div>
            <span className="eyebrow">ระบบแนะนำ</span>
            <h2>เลือกตามงานโรงเรียน</h2>
            <p className="muted">
              เลือกดูระบบที่เหมาะกับงานของคุณ ทดลองก่อนตัดสินใจ
            </p>
          </div>
          <Link className="subtle-link" href="/products">
            ดูโปรแกรมทั้งหมด <ArrowUpRight size={17} />
          </Link>
        </div>
        {source !== "database" && (
          <p className="notice">
            {source === "roadmap"
              ? "โปรแกรมที่เปิดรับออเดอร์ขอใบเสนอราคาได้ ทีมงานยืนยันขอบเขตและการติดตั้งก่อนสั่งซื้อ"
              : "ไม่สามารถโหลดแคตตาล็อกจากฐานข้อมูลได้ในขณะนี้"}
          </p>
        )}
        <div className="product-grid featured-collection">
          {products.map((p) => (
            <ProductCard key={p.id} p={p} />
          ))}
        </div>
      </section>
      <SchoolPackage />
      <HomeStats
        stats={[
          {
            value: products.length,
            label: "โปรแกรมในแคตตาล็อก",
            detail: "ขอราคาและนัดวางระบบได้จากหน้าสินค้า",
          },
          {
            value: products.length,
            label: "ระบบที่เปิดทดลองได้",
            detail: "ใช้ข้อมูลสมมติในเบราว์เซอร์",
          },
          {
            value: productDemos.filter(
              (demo) => demo.stage === "release_candidate",
            ).length,
            label: "Source Code รุ่นทดสอบ",
            detail: "รอตรวจรับก่อนเปิดจำหน่าย",
          },
        ]}
      />
      <div className="capability-strip">
        <span>สร้างมาเพื่อโรงเรียนไทย</span>
        <div>
          <MonitorSmartphone size={20} /> ใช้งานได้ทุกอุปกรณ์
        </div>
        <div>
          <Code2 size={20} /> ปรับแต่ง Source Code ได้
        </div>
        <div>
          <ShieldCheck size={20} /> สิทธิ์เข้าถึงข้อมูลตามหน้าที่
        </div>
      </div>
      <HomeFeatures />
      <section className="section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">HOW IT WORKS</span>
            <h2>จากโปรแกรมที่ชอบ สู่โรงเรียนของคุณ</h2>
          </div>
        </div>
        <div className="how-grid">
          {[
            [
              "01",
              "เลือกและทดลอง",
              "สำรวจรายละเอียดและทดลองระบบด้วยข้อมูลสมมติ",
            ],
            [
              "02",
              "สั่งซื้ออย่างมั่นใจ",
              "รวมรายการ ส่งคำขอทาง LINE และยืนยันราคาในใบเสนอราคา",
            ],
            [
              "03",
              "ดาวน์โหลดและติดตั้ง",
              "นัดติดตั้ง อบรม และรับเอกสารส่งมอบตามใบเสนอราคา",
            ],
          ].map(([n, h, t]) => (
            <div key={n}>
              <span>{n}</span>
              <h3>{h}</h3>
              <p className="muted">{t}</p>
            </div>
          ))}
        </div>
      </section>
      <HomeFAQ />
    </>
  );
}
