"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { distributor, lineMessage, lineId, shopPhone } from "@/lib/procurement";
import {
  schoolBudgetOptions,
  schoolPackage,
  schoolQuotePrice,
  schoolQuoteTotal,
} from "@/lib/quote";
import { updateQuoteSelection, useQuoteSelection } from "./QuoteSelection";
import QuoteMessage from "./QuoteMessage";

type QuoteProduct = { slug: string; name: string };

export default function QuoteCart({
  catalog,
  selectedSlug,
}: {
  catalog: QuoteProduct[];
  selectedSlug?: string;
}) {
  const selected = useQuoteSelection();
  const [removed, setRemoved] = useState("");
  const [prepared, setPrepared] = useState("");
  const [copied, setCopied] = useState(false);
  const entries = catalog.filter(
    ({ slug }) => selected[slug] || (slug === selectedSlug && removed !== slug),
  );
  const total = schoolQuoteTotal(entries.map(({ slug }) => slug));

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!entries.length) return;
    const data = new FormData(event.currentTarget);
    const school = String(data.get("school") ?? "").trim();
    const person = String(data.get("person") ?? "").trim();
    if (!school || !person) {
      const field = event.currentTarget.elements.namedItem(
        !school ? "school" : "person",
      );
      if (field instanceof HTMLInputElement) {
        field.setCustomValidity("กรุณากรอกข้อมูล");
        field.reportValidity();
      }
      return;
    }
    const note = String(data.get("note") ?? "").trim();
    const message = [
      "ขอใบเสนอราคาแพ็กเกจสำหรับโรงเรียน",
      `ชื่อโรงเรียน: ${school}`,
      `ผู้ติดต่อ: ${person}`,
      `เบอร์โทร: ${data.get("phone")}`,
      `หมวดงบประมาณ: ${data.get("budget")}`,
      ...entries.map(({ slug, name }, index) => {
        const packageName =
          slug === "met-sport" ? `${name} (กีฬาสี + เกียรติบัตรออนไลน์)` : name;
        return `${index + 1}. ${packageName} · ${schoolQuotePrice(slug)}`;
      }),
      total.amount && `${total.label}: ${total.amount}`,
      total.pending,
      note && `รายละเอียด: ${note}`,
    ]
      .filter(Boolean)
      .join("\n");
    setPrepared(message);
    setCopied(false);
    if (navigator.clipboard?.writeText) {
      void navigator.clipboard
        .writeText(message)
        .then(() => setCopied(true))
        .catch(() => {});
    }
    window.open(lineMessage(message), "_blank", "noopener,noreferrer");
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
          แล้วส่งคำขอรวมชุด
        </p>
      ) : (
        <>
          <p>{schoolPackage.label}</p>
          <ul className="quote-selection-list">
            {entries.map(({ slug, name }) => (
              <li key={slug}>
                <strong>{name}</strong>
                <span>{schoolQuotePrice(slug)}</span>
                <button
                  type="button"
                  className="btn ghost"
                  aria-label={`นำ ${name} ออก`}
                  onClick={() => {
                    updateQuoteSelection(slug);
                    setRemoved(slug);
                    setPrepared("");
                  }}
                >
                  นำออก
                </button>
              </li>
            ))}
          </ul>
          {total.amount && (
            <p className="quote-estimate">
              {total.label} <strong>{total.amount}</strong>
            </p>
          )}
          {total.pending && <p className="muted">{total.pending}</p>}
          <p className="muted">ทีมงานยืนยันราคาและขอบเขตส่งมอบในใบเสนอราคา</p>
          <form
            className="stack"
            onSubmit={submit}
            onChange={() => setPrepared("")}
          >
            <label>
              ชื่อโรงเรียน
              <input
                name="school"
                required
                maxLength={120}
                autoComplete="organization"
                onInput={(event) => event.currentTarget.setCustomValidity("")}
              />
            </label>
            <label>
              ชื่อผู้ติดต่อ
              <input
                name="person"
                required
                maxLength={100}
                autoComplete="name"
                onInput={(event) => event.currentTarget.setCustomValidity("")}
              />
            </label>
            <label>
              เบอร์โทร
              <input
                name="phone"
                required
                type="tel"
                pattern={String.raw`\+?\d[\d .\-]{6,18}\d`}
                maxLength={22}
                autoComplete="tel-national"
              />
            </label>
            <label>
              หมวดงบประมาณ
              <select name="budget" defaultValue={schoolBudgetOptions[0]}>
                {schoolBudgetOptions.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
            <label>
              รายละเอียดโครงการ (ถ้ามี)
              <textarea name="note" maxLength={250} rows={3} />
            </label>
            <button className="market-primary" type="submit">
              เปิด LINE พร้อมคำขอใบเสนอราคา
            </button>
          </form>
          {prepared && (
            <div className="stack market-budget">
              <p role="status">
                {copied ? "คัดลอกข้อความแล้ว · " : ""}เปิดแชท {distributor}{" "}
                แล้วกดส่งใน LINE
              </p>
              <QuoteMessage prepared={prepared} />
              <a
                className="market-primary"
                href={lineMessage(prepared)}
                target="_blank"
                rel="noopener noreferrer"
              >
                เปิดคำขออีกครั้ง · {lineId}
              </a>
              <a href={shopPhone.href}>โทร {shopPhone.label}</a>
            </div>
          )}
        </>
      )}
    </section>
  );
}
