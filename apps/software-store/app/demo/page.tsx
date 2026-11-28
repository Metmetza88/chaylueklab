import Link from "next/link";
import Image from "next/image";
import { productDemos } from "@/lib/product-demos";
import styles from "./demo.module.css";
import ProductPreview from "@/components/ProductPreview";
import { getProducts } from "@/lib/shop";
import { schoolOffers } from "@/lib/school-offers";

export default async function Page() {
  const { products } = await getProducts();
  const existing = new Set(productDemos.map((demo) => demo.slug));
  const samples = schoolOffers(products).filter(
    (product) => !existing.has(product.slug),
  );
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
      {samples.length > 0 && (
        <section className="section" aria-labelledby="sample-demos-title">
          <h2 id="sample-demos-title">แดชบอร์ดทดลองรายโปรแกรม</h2>
          <div className="product-grid">
            {samples.map((product) => (
              <article className="product-card" key={product.slug}>
                <Link
                  href={`/demo/${product.slug}`}
                  aria-label={`เปิดเดโม ${product.name}`}
                >
                  <ProductPreview product={product} />
                </Link>
                <div className="product-content stack">
                  <h3>{product.name}</h3>
                  <p>{product.tagline}</p>
                  <Link className="btn" href={`/demo/${product.slug}`}>
                    ทดลองใช้ตัวจริง (Live Demo)
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
      <p className="notice">
        เดโมใช้ข้อมูลสมมติในเบราว์เซอร์
        สอบถามราคาและกำหนดติดตั้งได้จากหน้ารายละเอียดโปรแกรม
      </p>
    </section>
  );
}
