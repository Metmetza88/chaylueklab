"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import {
  addFriendLine,
  distributor,
  lineId,
  quoteLineChat,
  shopPhone,
} from "@/lib/procurement";
import {
  schoolBudgetOptions,
  schoolPackage,
  schoolQuotePrice,
  summarizeSchoolQuote,
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
  const selectionKey = JSON.stringify(entries.map(({ slug }) => slug));
  const { groups, unpriced } = summarizeSchoolQuote(
    entries.map(({ slug }) => slug),
  );
  const unpricedLabel = `รอประเมินราคาอีก ${unpriced} ระบบ (ไม่รวมในยอดด้านบน)`;
  const [preparedFor, setPreparedFor] = useState("");
  const visibleDraft = preparedFor === selectionKey ? prepared : "";

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
      ...entries.map(
        ({ name, slug }, index) =>
          `${index + 1}. ${name} · ${schoolQuotePrice(slug)}`,
      ),
      ...groups.map(({ unit, label }) => `ยอดประเมินต่อ${unit}: ${label}`),
      unpriced > 0 && `รอประเมินอีก ${unpriced} ระบบ (ไม่รวมในยอดประเมิน)`,
      note && `รายละเอียด: ${note}`,
    ]
      .filter(Boolean)
      .join("\n");
    setPrepared(message);
    setPreparedFor(selectionKey);
    setCopied(false);
  }

  function openLine() {
    setCopied(false);
    try {
      void navigator.clipboard?.writeText(visibleDraft).then(
        () => setCopied(true),
        () => setCopied(false),
      );
    } catch {
      // The visible draft and its copy button remain available.
    }
    window.open(quoteLineChat, "_blank", "noopener,noreferrer");
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
          <p>{schoolPackage.label} · ราคาแตกต่างตามระบบและระยะเวลา</p>
          <ul className="quote-selection-list">
            {entries.map(({ slug, name }) => (
              <li key={slug}>
                <span>
                  <strong>{name}</strong>
                  <br />
                  <small>{schoolQuotePrice(slug)}</small>
                </span>
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
          {groups.length > 0 && (
            <div className="quote-estimate">
              {groups.map(({ unit, label }) => (
                <p key={unit}>
                  ยอดประเมินต่อ{unit} <strong>{label}</strong>
                </p>
              ))}
            </div>
          )}
          {unpriced > 0 && (
            <p className="muted">
              {groups.length
                ? unpricedLabel
                : "ราคาทั้งหมดรอประเมินตามขอบเขตงาน"}
            </p>
          )}
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
              ตรวจข้อความขอใบเสนอราคา
            </button>
          </form>
          {visibleDraft && (
            <div className="stack market-budget">
              <p role="status">
                {copied ? "คัดลอกข้อความแล้ว · " : ""}ตรวจข้อความก่อน
                แล้ววางและกดส่งในแชท {distributor} ด้วยตนเอง
              </p>
              <QuoteMessage prepared={visibleDraft} />
              <button
                className="market-primary"
                type="button"
                onClick={openLine}
              >
                คัดลอกและเปิดแชท LINE · {lineId}
              </button>
              <a href={quoteLineChat} target="_blank" rel="noopener noreferrer">
                เปิดแชทอีกครั้ง · {lineId}
              </a>
              <a href={addFriendLine} target="_blank" rel="noopener noreferrer">
                ดูโปรไฟล์หรือ QR สำหรับเปิดในมือถือ
              </a>
              <a href={shopPhone.href}>โทร {shopPhone.label}</a>
            </div>
          )}
        </>
      )}
    </section>
  );
}
