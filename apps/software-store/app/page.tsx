import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  ArrowUpRight,
  Code2,
  ShieldCheck,
  MonitorSmartphone,
  Check,
} from "lucide-react";
import { getProducts } from "@/lib/shop";
import ProductCard from "@/components/ProductCard";
import HomeStats from "@/components/HomeStats";
import HomeFeatures from "@/components/HomeFeatures";
import HomeFAQ from "@/components/HomeFAQ";
import { productDemos } from "@/lib/product-demos";
export default async function Home() {
  if (process.env.APP_VARIANT === "school")
    redirect(`/schools/${process.env.SCHOOL_SLUG ?? "my-school"}`);
  const { products, source } = await getProducts();
  const readyCount = products.filter(
    (product) => product.status === "ready",
  ).length;
  const featured = [...products]
    .sort(
      (a, b) =>
        ["met-admission", "met-school-pro"].indexOf(b.slug) -
        ["met-admission", "met-school-pro"].indexOf(a.slug),
    )
    .slice(0, 3);
  return (
    <>
      <section className="hero hero-premium">
        <div className="hero-artwork" aria-hidden="true" />
        <div className="hero-coordinate" aria-hidden="true">
          CHAYLUEKLAB / DIGITAL COLLECTION
        </div>
        <div className="hero-copy">
          <span className="pill">
            <span className="dot" /> WORAMET AI LAB · BUILT FOR EDUCATION
          </span>
          <h1>
            ออกแบบเวลาใหม่
            <br />
            ให้<span className="gradient-text">โรงเรียนของคุณ</span>
          </h1>
          <p>
            พื้นที่ของเครื่องมือที่คิดมาเพื่องานโรงเรียน
            <br className="desktop-only" />
            รวมโปรแกรมสำหรับโรงเรียนไทย ตั้งแต่รับสมัคร
            <br className="desktop-only" />
            ไปจนถึงงานวิชาการและบริหาร
          </p>
          <div className="row hero-buttons">
            <Link className="btn" href="/products">
              ค้นหาโปรแกรมของคุณ <ArrowRight size={18} />
            </Link>
            <Link className="btn ghost" href="/demo">
              ทดลองใช้งาน <ArrowUpRight size={18} />
            </Link>
          </div>
          <p className="hero-status">
            {readyCount === 0
              ? "อยู่ระหว่างพัฒนา · ทดลองด้วยข้อมูลสมมติก่อนเปิดจำหน่าย"
              : "ดูสถานะพร้อมจำหน่ายและรายละเอียดของแต่ละโปรแกรม"}
          </p>
          <div className="hero-proof">
            <span>
              <Check size={15} /> รายละเอียด Source Code และคู่มือ
            </span>
            <span>
              <Check size={15} /> ใช้งานผ่านมือถือ
            </span>
          </div>
          <p>
            <Link className="subtle-link" href="/school-systems">
              วางระบบสำหรับโรงเรียนและขอเอกสารจัดซื้อ <ArrowUpRight size={15} />
            </Link>
          </p>
        </div>
        <div className="hero-visual">
          <div className="visual-glow" />
          <div className="mini-window">
            <div className="window-bar">
              <div>
                <i />
                <i />
                <i />
              </div>
              <span>MET ADMISSION / ตัวอย่างข้อมูลสมมติ</span>
              <ShieldCheck size={13} />
            </div>
            <div className="window-body">
              <aside>
                <span className="mini-logo">
                  M<span>ET</span>
                </span>
                <div className="mini-active">ภาพรวมระบบ</div>
                <div>ใบสมัครเรียน</div>
                <div>ตรวจเอกสาร</div>
                <div>ตั้งค่าโรงเรียน</div>
                <small>WORAMET AI LAB</small>
              </aside>
              <div className="mini-main">
                <span className="eyebrow">SCHOOL WORKSPACE</span>
                <h3>ทุกการเริ่มต้น จัดการได้ง่ายขึ้น</h3>
                <div className="mini-tiles">
                  <div>
                    <span>01</span>
                    <small>สมัครออนไลน์</small>
                  </div>
                  <div>
                    <span>02</span>
                    <small>ตรวจเอกสาร</small>
                  </div>
                  <div>
                    <span>03</span>
                    <small>ประกาศผล</small>
                  </div>
                </div>
                <div className="mini-list">
                  <div className="row spaced">
                    <strong>ขั้นตอนการรับสมัคร</strong>
                    <span className="cyan">ดูระบบ →</span>
                  </div>
                  {[
                    "กรอกข้อมูลและเลือกชั้นเรียน",
                    "แนบเอกสารและตรวจสอบข้อมูล",
                    "ติดตามสถานะใบสมัคร",
                  ].map((t, i) => (
                    <div className="mini-list-row" key={t}>
                      <span className="step-dot">{i + 1}</span>
                      <span>{t}</span>
                      <Check size={13} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="floating-tag">
            <Code2 size={21} />
            <div>
              <b>Designed for your school</b>
              <small>Next.js + TypeScript + Supabase</small>
            </div>
          </div>
        </div>
      </section>
      <HomeStats
        stats={[
          {
            value: products.length,
            label: "โปรแกรมในแคตตาล็อก",
            detail: "ดูสถานะและแผนพัฒนาในหน้าสินค้า",
          },
          {
            value: productDemos.length,
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
      <section className="section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">CURATED FOR YOUR SCHOOL</span>
            <h2>เครื่องมือดี ๆ เริ่มต้นที่นี่</h2>
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
              ? "แคตตาล็อกแผนพัฒนา · ยังไม่เปิดจำหน่ายหรือรับชำระเงิน"
              : "ไม่สามารถโหลดแคตตาล็อกจากฐานข้อมูลได้ในขณะนี้"}
          </p>
        )}
        <div className="product-grid featured-collection">
          {featured.map((p) => (
            <ProductCard key={p.id} p={p} />
          ))}
        </div>
      </section>
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
              "เมื่อเปิดจำหน่ายแล้ว ชำระตามยอดคำสั่งซื้อที่ระบบคำนวณ",
            ],
            [
              "03",
              "ดาวน์โหลดและติดตั้ง",
              "รับสิทธิ์ดาวน์โหลดหลังตรวจสอบการชำระ พร้อมคู่มือภาษาไทย",
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
