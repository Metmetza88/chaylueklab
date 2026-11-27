import Link from "next/link";
import Image from "next/image";
import { productDemos } from "@/lib/product-demos";
import { linkedDemos, trialLine } from "@/lib/procurement";
import styles from "./demo.module.css";
export default function Page() {
  return (
    <section className="section">
      <span className="eyebrow">TRY BEFORE YOU CHOOSE</span>
      <h1>ทดลองใช้งาน</h1>
      <p className="muted">
        สำรวจขั้นตอนใช้งานด้วยข้อมูลสมมติ ไม่มีการรับข้อมูลเด็กจริงในระบบทดลอง
      </p>
      <div className="info-grid">
        {productDemos.map(
          ({ slug, name, description, preview, previewAlt }, index) => (
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
                <Link className="btn" href={`/demo/${slug}`}>
                  เปิดระบบทดลอง →
                </Link>
                <Link href={`/products/${slug}`}>รายละเอียดโปรแกรม</Link>
              </div>
            </article>
          ),
        )}
      </div>
      <div className="info-grid demo-links">
        {linkedDemos.map(({ name, href, description }) => (
          <article className="panel stack" key={href}>
            <h2>{name}</h2>
            <p>{description}</p>
            <Link className="btn" href={href}>
              ทดลอง{name} →
            </Link>
          </article>
        ))}
      </div>
      <a className="btn ghost" href={trialLine}>
        ขอรหัสทดลองใช้ทาง LINE OA @125cbuuu ↗
      </a>
      <p className="notice">
        เดโมใช้ข้อมูลสมมติในเบราว์เซอร์
        สถานะการเปิดบริการของแต่ละระบบดูได้จากหน้ารายละเอียดโปรแกรม
      </p>
    </section>
  );
}
