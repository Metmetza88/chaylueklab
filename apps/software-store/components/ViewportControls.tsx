"use client";

import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";

export default function ViewportControls() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const length = document.documentElement.scrollHeight - innerHeight;
        document.documentElement.style.setProperty(
          "--reading-progress",
          String(length > 0 ? Math.min(1, Math.max(0, scrollY / length)) : 0),
        );
        setScrolled(scrollY > 800);
      });
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);
  return (
    <>
      <div className="reading-progress" aria-hidden="true" />
      {scrolled && (
        <button
          type="button"
          className="back-to-top"
          aria-label="กลับด้านบน"
          onClick={() =>
            window.scrollTo({
              top: 0,
              behavior:
                document.documentElement.dataset.storeMotion === "on" &&
                !matchMedia("(prefers-reduced-motion: reduce)").matches
                  ? "smooth"
                  : "auto",
            })
          }
        >
          <ArrowUp size={20} />
        </button>
      )}
    </>
  );
}
