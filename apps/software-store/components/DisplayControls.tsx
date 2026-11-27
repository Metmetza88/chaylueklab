"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Palette, Pause, Play, RotateCcw } from "lucide-react";

const KEY = "chaylueklab-store:display:v1";
const themes = [
  { id: "midnight", name: "Midnight Gold", detail: "น้ำเงินลึก · ทองแชมเปญ" },
  { id: "aurora", name: "Aurora", detail: "เขียวเข้ม · แสงไซแอน" },
  { id: "graphite", name: "Graphite", detail: "ดำกราไฟต์ · เงิน" },
] as const;
type Theme = (typeof themes)[number]["id"];

export default function DisplayControls() {
  const [theme, setTheme] = useState<Theme>("midnight");
  const [motion, setMotion] = useState(true);
  const [reduced, setReduced] = useState(false);
  const [ready, setReady] = useState(false);
  const details = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(preference.matches);
    update();
    try {
      const raw = localStorage.getItem(KEY);
      const saved = raw && raw.length < 200 ? JSON.parse(raw) : null;
      if (themes.some((t) => t.id === saved?.theme)) setTheme(saved.theme);
      if (typeof saved?.motion === "boolean") setMotion(saved.motion);
    } catch {
      /* Rendering remains usable when storage is unavailable. */
    }
    setReady(true);
    preference.addEventListener("change", update);
    const close = (event: PointerEvent) => {
      if (details.current && !details.current.contains(event.target as Node))
        details.current.open = false;
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && details.current?.open) {
        details.current.open = false;
        details.current.querySelector("summary")?.focus();
      }
    };
    document.addEventListener("pointerdown", close, { passive: true });
    document.addEventListener("keydown", escape);
    return () => {
      preference.removeEventListener("change", update);
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", escape);
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    document.documentElement.dataset.storeTheme = theme;
    document.documentElement.dataset.storeMotion =
      motion && !reduced ? "on" : "off";
    try {
      localStorage.setItem(KEY, JSON.stringify({ theme, motion }));
    } catch {}
  }, [theme, motion, reduced, ready]);

  return (
    <>
      <details ref={details} className="display-controls">
        <summary aria-label="รูปแบบและเอฟเฟกต์หน้าเว็บ">
          <Palette size={18} />
          <span>รูปแบบ</span>
        </summary>
        <div className="display-panel">
          <span className="eyebrow">YOUR VIEW / YOUR PACE</span>
          <h2>พื้นที่ทำงาน ในสไตล์คุณ</h2>
          <p>เลือกบรรยากาศและการเคลื่อนไหวสำหรับเบราว์เซอร์นี้</p>
          <div className="theme-options" role="group" aria-label="ธีมหน้าเว็บ">
            {themes.map((t) => (
              <button
                type="button"
                key={t.id}
                data-swatch={t.id}
                aria-pressed={theme === t.id}
                onClick={() => setTheme(t.id)}
              >
                <i aria-hidden="true" />
                <span>
                  <strong>{t.name}</strong>
                  <small>{t.detail}</small>
                </span>
                {theme === t.id ? <Check size={16} /> : null}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="display-motion"
            disabled={reduced || !ready}
            aria-pressed={motion && !reduced}
            onClick={() => setMotion((value) => !value)}
          >
            {motion && !reduced ? <Pause size={17} /> : <Play size={17} />}
            {reduced
              ? "ภาพนิ่งตามการตั้งค่าอุปกรณ์"
              : motion
                ? "หยุดเอฟเฟกต์"
                : "เปิดเอฟเฟกต์"}
          </button>
          <button
            type="button"
            className="display-reset"
            onClick={() => {
              setTheme("midnight");
              setMotion(true);
            }}
          >
            <RotateCcw size={14} /> คืนค่าเริ่มต้น
          </button>
        </div>
      </details>
    </>
  );
}
