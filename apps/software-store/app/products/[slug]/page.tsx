import { notFound } from "next/navigation";
import Link from "next/link";
import { Check, ArrowUpRight, ClipboardList } from "lucide-react";
import AddToCart from "@/components/AddToCart";
import ProductPreview from "@/components/ProductPreview";
import { AddToQuote } from "@/components/QuoteSelection";
import { storeOffer } from "@/lib/store-offers";
import { quoteHref } from "@/lib/marketplace";
import { getProducts } from "@/lib/shop";
import { paymentMode } from "@/lib/env";
import ProductGallery from "@/components/ProductGallery";
import { productDemos } from "@/lib/product-demos";
import {
  isSchoolPackage,
  schoolPackageDetails,
  schoolPackagePriceLabel,
} from "@/lib/school-packages";

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
  const hasDemo = productDemos.some((demo) => demo.slug === slug);
  const images = screenshots[slug];
  const schoolPackage = isSchoolPackage(slug);
  const offer = storeOffer(p.slug, p.status);
  const hasExistingPurchase =
    p.status === "ready" && paymentMode() !== "disabled";

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
            <ProductPreview product={p} large />
          )}
        </div>
        <div className="stack">
          <span className="eyebrow">{p.category}</span>
          <h1>{p.name}</h1>
          <h2>{p.tagline}</h2>
          <p className="muted">{p.description}</p>
          <span
            className={`status market-offer-${schoolPackage ? "order" : offer.kind}`}
          >
            {schoolPackage
              ? "เปิดรับประเมินงาน"
              : hasExistingPurchase
                ? "ติดต่อเพื่อเช็กความพร้อม"
                : offer.label}
          </span>
          {schoolPackage ? (
            <div className="detail-price school-package-detail-price">
              {schoolPackagePriceLabel}
              <small>
                งบประเมินแพ็กเกจต่อระบบ ไม่ใช่ราคายืนยัน
                ทีมงานตกลงขอบเขตและกำหนดส่งกับโรงเรียนก่อนรับงาน
              </small>
            </div>
          ) : (
            <p className="notice">โปรดสอบถามความพร้อมและขอบเขตงานก่อนจัดซื้อ</p>
          )}
          <ul className="feature-list">
            {p.features.map((f) => (
              <li key={f}>
                <Check size={17} aria-hidden="true" />
                {f}
              </li>
            ))}
          </ul>
          <div className="market-links">
            {schoolPackage && (
              <Link className="btn" href={quoteHref(slug)}>
                ขอใบเสนอราคา <ClipboardList size={16} aria-hidden="true" />
              </Link>
            )}
            {hasDemo && (
              <Link className="btn ghost" href={`/demo/${slug}`}>
                ทดลองดูตัวอย่าง (Demo){" "}
                <ArrowUpRight size={18} aria-hidden="true" />
              </Link>
            )}
            {schoolPackage ? (
              <AddToQuote slug={slug} />
            ) : (
              <Link className="btn ghost" href="/contact">
                ติดต่อสอบถาม
              </Link>
            )}
          </div>
          {hasDemo && (
            <p className="muted">
              เดโมใช้ข้อมูลสมมติ
              ไม่ใช่ระบบที่ติดตั้งและตรวจรับแล้วสำหรับโรงเรียนของคุณ
            </p>
          )}
          {hasExistingPurchase && (
            <details className="panel product-legacy-purchase">
              <summary>ซื้อไฟล์หรือจัดการรายการเดิม</summary>
              <p className="muted">
                ระบบสั่งซื้อไฟล์เดิม แยกจากแพ็กเกจติดตั้งตามใบเสนอราคา
              </p>
              <AddToCart id={p.id} />
            </details>
          )}
        </div>
      </div>
      <div className="info-grid">
        <section className="panel">
          <h2>
            {schoolPackage ? "ขอบเขตแพ็กเกจพร้อมติดตั้ง" : "ขอบเขตการส่งมอบ"}
          </h2>
          {schoolPackage ? (
            <>
              <ul className="feature-list">
                {schoolPackageDetails.map((detail) => (
                  <li key={detail}>{detail}</li>
                ))}
              </ul>
              <p className="muted">
                สิ่งที่จะส่งมอบ สิทธิ์การใช้งาน การนำเข้าข้อมูล และวันส่งงาน
                จะแจ้งไว้ในใบเสนอราคาและยืนยันก่อนเริ่มงาน
              </p>
            </>
          ) : (
            <>
              <p>
                รายการที่อาจส่งมอบ ได้แก่ Source Code, ฐานข้อมูล, ระบบผู้ดูแล,
                คู่มือภาษาไทย และไฟล์ ZIP ตามรุ่นที่ตกลง
              </p>
              <p className="muted">
                จะระบุเวอร์ชันพร้อมขายเมื่อทดสอบและตรวจรับแล้วเท่านั้น
              </p>
            </>
          )}
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
