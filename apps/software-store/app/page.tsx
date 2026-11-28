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
import { quoteHref } from "@/lib/marketplace";
import {
  schoolPackagePriceLabel,
  schoolPackageSlugs,
} from "@/lib/school-packages";
import { productDemos } from "@/lib/product-demos";
export default async function Home() {
  if (process.env.APP_VARIANT === "school")
    redirect(`/schools/${process.env.SCHOOL_SLUG ?? "my-school"}`);
  const { products, source } = await getProducts();
  // Keep the storefront's lead cards limited to the four trial-backed packages.
  const featured = schoolPackageSlugs.flatMap(
    (slug) => products.find((product) => product.slug === slug) ?? [],
  );
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
            แพ็กเกจระบบโรงเรียน
            <br />
            ทดลองก่อนวางระบบ
          </h1>
          <p>
            กีฬาสี เช็กชื่อ รับสมัคร และเว็บไซต์โรงเรียน
            ลองทำงานในเดโมด้วยข้อมูลสมมติ ก่อนขอให้ทีมงานประเมินการติดตั้ง
          </p>
          <div className="school-package-hero-estimate">
            <strong>{schoolPackagePriceLabel}</strong>
            <span>งบประเมินต่อระบบ ยืนยันตามขอบเขตในใบเสนอราคา</span>
          </div>
          <div className="school-store-actions">
            <Link className="btn" href={quoteHref()}>
              ขอใบเสนอราคาติดตั้ง <ArrowRight size={17} />
            </Link>
            <Link className="btn ghost" href="/demo">
              ทดลองดูตัวอย่าง (Demo) <ArrowUpRight size={16} />
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
              ? "เปิดรับประเมินแพ็กเกจโรงเรียน ทีมงานยืนยันขอบเขต ราคา และกำหนดส่งก่อนรับงาน"
              : "ไม่สามารถโหลดแคตตาล็อกจากฐานข้อมูลได้ในขณะนี้"}
          </p>
        )}
        <div className="product-grid featured-collection">
          {featured.map((p) => (
            <ProductCard key={p.id} p={p} />
          ))}
        </div>
      </section>
      <HomeStats
        stats={[
          {
            value: featured.length,
            label: "แพ็กเกจที่รับประเมิน",
            detail: "ตกลงขอบเขตและราคาก่อนเริ่มงาน",
          },
          {
            value: productDemos.length + 1,
            label: "ระบบที่เปิดทดลองได้",
            detail: "ใช้ข้อมูลสมมติ รวม MET Vote ที่เป็นเดโมเท่านั้น",
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
          <Code2 size={20} /> ตั้งค่าตามขอบเขตโรงเรียน
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
              "ขอใบเสนอราคา",
              "แจ้งระบบที่สนใจ จำนวนผู้ใช้ และเอกสารที่โรงเรียนต้องการ ทีมงานจะประเมินขอบเขตและราคา",
            ],
            [
              "03",
              "ยืนยันขอบเขตและติดตั้ง",
              "ทีมงานนัดติดตั้ง ตั้งค่า และแนะนำการใช้งานตามใบเสนอราคาที่ตกลง",
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
