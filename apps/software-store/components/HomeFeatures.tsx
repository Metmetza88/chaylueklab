"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState, type KeyboardEvent } from "react";
import { ArrowUpRight, Check } from "lucide-react";
import { productDemos } from "@/lib/product-demos";
import styles from "./home-sections.module.css";

const order = [
  "met-admission",
  "met-school-pro",
  "met-attendance",
  "met-sport",
];
const features = [...productDemos].sort(
  (a, b) => order.indexOf(a.slug) - order.indexOf(b.slug),
);

export default function HomeFeatures() {
  const [selected, setSelected] = useState(0);
  const buttons = useRef<Array<HTMLButtonElement | null>>([]);
  function move(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next: number;
    if (event.key === "ArrowRight") next = (index + 1) % features.length;
    else if (event.key === "ArrowLeft")
      next = (index + features.length - 1) % features.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = features.length - 1;
    else return;
    event.preventDefault();
    setSelected(next);
    buttons.current[next]?.focus();
  }
  return (
    <section className={styles.features} aria-labelledby="home-features-title">
      <span className="eyebrow">FIND YOUR WORKFLOW</span>
      <h2 id="home-features-title">เลือกดูระบบ ให้ตรงกับงานของคุณ</h2>
      <p className="muted">
        สลับงานเพื่อดูภาพหน้าจอและจุดเด่น แล้วเข้าไปทดลองด้วยตัวเอง
      </p>
      <div className={styles.tabs} role="tablist" aria-label="เลือกงานโรงเรียน">
        {features.map((feature, index) => (
          <button
            key={feature.slug}
            ref={(node) => {
              buttons.current[index] = node;
            }}
            type="button"
            role="tab"
            id={`tab-${feature.slug}`}
            aria-controls={`feature-${feature.slug}`}
            aria-selected={selected === index}
            tabIndex={selected === index ? 0 : -1}
            onClick={() => setSelected(index)}
            onKeyDown={(event) => move(event, index)}
          >
            {feature.category}
          </button>
        ))}
      </div>
      {features.map((feature, index) => (
        <div
          key={feature.slug}
          className={styles.featurePanel}
          role="tabpanel"
          id={`feature-${feature.slug}`}
          aria-labelledby={`tab-${feature.slug}`}
          tabIndex={0}
          hidden={selected !== index}
        >
          <figure className={styles.featureFigure}>
            <div className={styles.featureImage}>
              <Image
                src={feature.preview}
                alt={feature.previewAlt}
                fill
                sizes="(max-width: 850px) calc(100vw - 64px), 680px"
                className={styles.screenshot}
              />
            </div>
            <figcaption>ภาพหน้าจอจาก Demo · ข้อมูลสมมติ</figcaption>
          </figure>
          <div className={styles.featureCopy}>
            <span className="eyebrow">{feature.category}</span>
            <h3>{feature.name}</h3>
            <p>{feature.description}</p>
            <ul>
              {feature.highlights.map((text) => (
                <li key={text}>
                  <Check size={17} aria-hidden="true" />
                  {text}
                </li>
              ))}
            </ul>
            <Link className="btn" href={`/demo/${feature.slug}`}>
              เปิด Demo {feature.name}
              <ArrowUpRight size={17} />
            </Link>
            <p className={styles.availability}>
              {feature.stage === "release_candidate"
                ? "เปิดรับออเดอร์ · มีเดโมและ Source Code รุ่นทดสอบ"
                : "เปิดรับออเดอร์ตามขอบเขตงาน · เดโมใช้ข้อมูลสมมติ"}
            </p>
          </div>
        </div>
      ))}
    </section>
  );
}
