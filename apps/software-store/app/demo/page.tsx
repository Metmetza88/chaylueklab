import Link from "next/link";
import Image from "next/image";
import { productDemos } from "@/lib/product-demos";
import { quoteHref } from "@/lib/marketplace";
import { isSchoolPackage, schoolPackageSlugs } from "@/lib/school-packages";
import styles from "./demo.module.css";

export default function Page() {
  const orderedDemos = [
    ...schoolPackageSlugs.flatMap(
      (slug) => productDemos.find((demo) => demo.slug === slug) ?? [],
    ),
    ...productDemos.filter(
      (demo) => !schoolPackageSlugs.some((slug) => slug === demo.slug),
    ),
  ];

  return (
    <section className="section">
      <span className="eyebrow">ลองระบบก่อนขอประเมินงาน</span>
      <h1>ทดลองใช้งาน</h1>
      <p className="muted">
        เดโมโต้ตอบได้และไม่ต้องเข้าสู่ระบบ ใช้ข้อมูลสมมติเท่านั้น
        ไม่รับข้อมูลเด็กจริง และไม่ใช่ระบบที่ติดตั้งแล้วสำหรับโรงเรียนของคุณ
      </p>
      <div className="info-grid">
        {orderedDemos.map(
          (
            { slug, name, description, highlights, preview, previewAlt },
            index,
          ) => (
            <article className="product-card" key={slug}>
              <figure className={styles.figure}>
                <Link
                  className={styles.preview}
                  href={`/demo/${slug}`}
                  aria-label={`เปิด ${name} จากภาพหน้าจอ`}
                >
                  <Image
                    src={preview}
                    alt={previewAlt}
                    fill
                    sizes="(max-width: 850px) calc(100vw - 32px), 628px"
                    priority={index === 0}
                    className={styles.screenshot}
                  />
                </Link>
                <figcaption className={styles.caption}>
                  ภาพหน้าจอจากระบบทดลอง · ข้อมูลสมมติ
                </figcaption>
              </figure>
              <div className="product-content stack">
                <span className="status">Interactive Demo · ข้อมูลสมมติ</span>
                <h2>{name}</h2>
                <p>{description}</p>
                <ul className={styles.highlights}>
                  {highlights.map((highlight) => (
                    <li key={highlight}>{highlight}</li>
                  ))}
                </ul>
                <div className={styles.actions}>
                  <Link className="btn" href={`/demo/${slug}`}>
                    เปิดระบบทดลอง →
                  </Link>
                  {isSchoolPackage(slug) && (
                    <Link className="btn ghost" href={quoteHref(slug)}>
                      ขอใบเสนอราคา
                    </Link>
                  )}
                </div>
                <Link href={`/products/${slug}`}>รายละเอียดโปรแกรม</Link>
              </div>
            </article>
          ),
        )}
      </div>
      <section
        className="panel vote-demo-callout"
        aria-labelledby="extra-demo-title"
      >
        <figure className={styles.voteScreenshot}>
          <Image
            src="/screenshots/demos/met-vote.webp"
            alt="หน้าจอเดโม MET Vote มีบัตรลงคะแนนสมมติและกราฟคะแนนหลังทดลอง"
            width={1148}
            height={652}
            sizes="(max-width: 680px) 75vw, 280px"
            unoptimized
          />
          <figcaption className={styles.caption}>
            หน้าจอเดโม · ข้อมูลสมมติ
          </figcaption>
        </figure>
        <div>
          <span className="eyebrow">ตัวอย่างแยกจากแพ็กเกจโรงเรียน</span>
          <h2 id="extra-demo-title">MET Vote</h2>
          <p className="muted">
            ทดลองเลือกผู้สมัครสมมติและดูกราฟคะแนนเปลี่ยนทันที เป็นเดโมเท่านั้น
            ไม่รับคะแนนจริงและยังไม่เปิดเป็นบริการติดตั้ง
          </p>
          <Link className="btn ghost" href="/demo/met-vote">
            ทดลอง MET Vote
          </Link>
        </div>
      </section>
      <p className="notice">
        ผลจากการทดลองไม่ใช่ข้อมูลที่บันทึกในระบบโรงเรียน
        การติดตั้งจริงและรายการส่งมอบเป็นไปตามขอบเขตที่ตกลงในใบเสนอราคา
      </p>
    </section>
  );
}
