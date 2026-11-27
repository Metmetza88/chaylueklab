"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { distributor, lineMessage, lineId, shopPhone } from "@/lib/procurement";
import { formatBaht, packages, serviceRange } from "@/lib/quote";
import {
  PackageChoice,
  updateQuoteSelection,
  useQuoteSelection,
} from "./QuoteSelection";
import QuoteMessage from "./QuoteMessage";

type QuoteProduct = { slug: string; name: string; price_cents: number };

export default function QuoteCart({ catalog }: { catalog: QuoteProduct[] }) {
  const selected = useQuoteSelection();
  const [contact, setContact] = useState({ school: "", phone: "", note: "" });
  const [review, setReview] = useState(false);
  const entries = catalog.flatMap((product) => {
    const plan = selected[product.slug];
    return plan ? [{ ...product, plan }] : [];
  });
  const { min, max } = entries.reduce(
    (totals, { plan, price_cents }) => ({
      min: totals.min + (plan === "service" ? serviceRange.min : price_cents),
      max: totals.max + (plan === "service" ? serviceRange.max : price_cents),
    }),
    { min: 0, max: 0 },
  );
  const total =
    min === max ? formatBaht(min) : `${formatBaht(min)}–${formatBaht(max)}`;
  const message = [
    "ขอใบเสนอราคารวมสำหรับโรงเรียน",
    `ชื่อโรงเรียน: ${contact.school}`,
    `เบอร์โทร: ${contact.phone}`,
    ...entries.map(
      ({ name, plan }, index) =>
        `${index + 1}. ${name} · ${packages[plan].label}`,
    ),
    `ยอดประเมินเบื้องต้น: ${total}`,
    contact.note && `รายละเอียด: ${contact.note}`,
  ]
    .filter(Boolean)
    .join("\n");

  function prepare(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setReview(true);
  }

  return (
    <section
      className="market-quote-selection"
      aria-labelledby="quote-selection-title"
    >
      <h3 id="quote-selection-title">ตะกร้าใบเสนอราคา ({entries.length})</h3>
      {!entries.length ? (
        <p>
          เพิ่มโปรแกรมได้จาก <Link href="/products">รายการโปรแกรม</Link>{" "}
          แล้วส่งขอใบเสนอราคารวมชุด
        </p>
      ) : (
        <>
          <ul className="quote-selection-list">
            {entries.map(({ slug, name, price_cents, plan }) => (
              <li key={slug}>
                <strong>{name}</strong>
                <PackageChoice
                  value={plan}
                  filesPrice={formatBaht(price_cents)}
                  onChange={(next) => {
                    updateQuoteSelection(slug, next);
                    setReview(false);
                  }}
                />
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() => {
                    updateQuoteSelection(slug);
                    setReview(false);
                  }}
                  aria-label={`นำ ${name} ออก`}
                >
                  นำออก
                </button>
              </li>
            ))}
          </ul>
          <p className="quote-estimate">
            ยอดประเมินเบื้องต้น <strong>{total}</strong>
          </p>
          <p className="muted">
            ร้านจะยืนยันราคาและขอบเขตในใบเสนอราคา
            งานติดตั้งเพิ่มเติมประเมินได้ถึง 9,900 บาทตามขอบเขต
          </p>
          <form className="stack" onSubmit={prepare}>
            <label>
              ชื่อโรงเรียน
              <input
                required
                maxLength={120}
                autoComplete="organization"
                value={contact.school}
                onChange={(event) => {
                  setContact({ ...contact, school: event.target.value });
                  setReview(false);
                }}
              />
            </label>
            <label>
              เบอร์โทร
              <input
                required
                type="tel"
                pattern={String.raw`\+?\d[\d .\-]{6,18}\d`}
                maxLength={22}
                autoComplete="tel-national"
                value={contact.phone}
                onChange={(event) => {
                  setContact({ ...contact, phone: event.target.value });
                  setReview(false);
                }}
              />
            </label>
            <label>
              รายละเอียดโครงการ (ถ้ามี)
              <textarea
                maxLength={350}
                rows={3}
                value={contact.note}
                onChange={(event) => {
                  setContact({ ...contact, note: event.target.value });
                  setReview(false);
                }}
              />
            </label>
            <button type="submit" className="market-primary">
              เตรียมคำขอใบเสนอราคารวม
            </button>
          </form>
          {review && (
            <div className="stack market-budget" role="status">
              <p>ตรวจข้อความแล้วกดเปิด LINE เพื่อส่งให้ {distributor}</p>
              <QuoteMessage prepared={message} />
              <a
                className="market-primary"
                href={lineMessage(message)}
                target="_blank"
                rel="noopener noreferrer"
              >
                เปิด LINE เพื่อส่งคำขอรวม · {lineId}
              </a>
              <a href={shopPhone.href}>โทร {shopPhone.label}</a>
            </div>
          )}
        </>
      )}
    </section>
  );
}
