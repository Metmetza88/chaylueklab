"use client";

import { useState } from "react";
import Image from "next/image";
import styles from "./product-gallery.module.css";

type Screenshot = { file: string; label: string };

export default function ProductGallery({ images }: { images: Screenshot[] }) {
  const [selected, setSelected] = useState(0);
  const current = images[selected];
  return (
    <div className={styles.gallery}>
      <figure className={styles.figure}>
        <div className={styles.preview}>
          <Image
            src={`/screenshots/${current.file}`}
            alt={current.label}
            fill
            sizes="(max-width: 760px) 92vw, 550px"
          />
        </div>
        <figcaption>
          <span aria-live="polite">{current.label}</span>
          <a
            href={`/screenshots/${current.file}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            เปิดภาพเต็ม
          </a>
        </figcaption>
      </figure>
      <div
        className={styles.thumbnails}
        role="group"
        aria-label="เลือกภาพตัวอย่าง"
      >
        {images.map((item, index) => (
          <button
            key={item.file}
            type="button"
            aria-pressed={index === selected}
            onClick={() => setSelected(index)}
          >
            <Image
              src={`/screenshots/${item.file}`}
              alt=""
              width={94}
              height={58}
            />
            <span>{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
