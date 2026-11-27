"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./home-sections.module.css";

type Stat = { value: number; label: string; detail: string };
const number = new Intl.NumberFormat("th-TH");

export default function HomeStats({ stats }: { stats: Stat[] }) {
  const root = useRef<HTMLElement>(null);
  // Actual totals remain visible in server-rendered HTML and without JavaScript.
  const [progress, setProgress] = useState(1);
  const [phase, setPhase] = useState("ready");

  useEffect(() => {
    const element = root.current;
    if (!element || !("IntersectionObserver" in window)) return;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let visible = false;
    let played = false;

    const update = () => {
      if (!visible) return;
      if (
        preference.matches ||
        document.documentElement.dataset.storeMotion === "off"
      ) {
        cancelAnimationFrame(frame);
        setProgress(1);
        setPhase("complete");
        return;
      }
      if (played) return;
      played = true;
      setProgress(0);
      setPhase("animating");
      const start = performance.now();
      const tick = (time: number) => {
        const elapsed = Math.min(1, (time - start) / 1100);
        setProgress(1 - Math.pow(1 - elapsed, 3));
        if (elapsed < 1) frame = requestAnimationFrame(tick);
        else setPhase("complete");
      };
      frame = requestAnimationFrame(tick);
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        update();
      },
      { threshold: 0.3 },
    );
    observer.observe(element);
    const motion = new MutationObserver(update);
    motion.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-store-motion"],
    });
    preference.addEventListener("change", update);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      motion.disconnect();
      preference.removeEventListener("change", update);
    };
  }, []);

  return (
    <section
      ref={root}
      className={styles.stats}
      aria-label="จำนวนระบบที่ตรวจสอบได้"
      data-counter-phase={phase}
    >
      <span className="eyebrow">WHAT YOU CAN EXPLORE</span>
      <dl className={styles.statGrid}>
        {stats.map(({ value, label, detail }) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>
              <span aria-hidden="true">
                {number.format(Math.round(value * progress))}
              </span>
              <span className={styles.srOnly}>{number.format(value)}</span>
              <p>{detail}</p>
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
