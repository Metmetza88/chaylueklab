"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import {
  distributor,
  lineId,
  quoteLineForPackages,
  shopPhone,
} from "@/lib/procurement";
import { lineContact } from "@/lib/marketplace";
import {
  formatEstimate,
  quoteBudgetLabel,
  quoteBudgets,
  quoteFundingLabel,
  quoteFundingSources,
  schoolPackageDescription,
  type QuoteBudget,
  type QuoteFundingSource,
} from "@/lib/quote";
import {
  isSchoolPackage,
  schoolPackagePriceLabel,
} from "@/lib/school-packages";
import {
  AddToQuote,
  updateQuoteSelection,
  useQuoteSelection,
} from "./QuoteSelection";
import QuoteMessage from "./QuoteMessage";

type QuoteProduct = { slug: string; name: string };
type Review = { key: string; message: string };
const noContact = {
  school: "",
  person: "",
  phone: "",
  funding: "" as QuoteFundingSource | "",
  budget: "" as QuoteBudget | "",
  note: "",
};

export default function QuoteCart({
  catalog,
  suggestedProduct,
}: {
  catalog: QuoteProduct[];
  suggestedProduct?: QuoteProduct;
}) {
  const selected = useQuoteSelection();
  const [contact, setContact] = useState(noContact);
  const [review, setReview] = useState<Review>();
  const [lineCopy, setLineCopy] = useState<"copied" | "failed" | "">("");
  const entries = catalog.filter(
    (product) =>
      isSchoolPackage(product.slug) && Boolean(selected[product.slug]),
  );
  const excluded = Object.keys(selected).filter(
    (slug) => !entries.some((product) => product.slug === slug),
  ).length;
  const hasLegacyFiles = entries.some(({ slug }) => selected[slug] === "files");
  const suggested =
    suggestedProduct &&
    isSchoolPackage(suggestedProduct.slug) &&
    !entries.some(({ slug }) => slug === suggestedProduct.slug)
      ? suggestedProduct
      : undefined;
  const selectionKey = JSON.stringify(entries.map(({ slug }) => slug));
  const sum = formatEstimate(entries.length);
  const prepared = review?.key === selectionKey ? review.message : undefined;

  function set<K extends keyof typeof contact>(
    key: K,
    value: (typeof contact)[K],
  ) {
    setContact((old) => ({ ...old, [key]: value }));
    setReview(undefined);
    setLineCopy("");
  }

  function copyForLine(draft: string) {
    setLineCopy("");
    // Start inside the click gesture; don't wait before letting LINE open.
    if (!navigator.clipboard?.writeText) {
      setLineCopy("failed");
      return;
    }
    try {
      void navigator.clipboard.writeText(draft).then(
        () => setLineCopy("copied"),
        () => setLineCopy("failed"),
      );
    } catch {
      setLineCopy("failed");
    }
  }

  function prepare(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!entries.length || !contact.funding) return;
    setLineCopy("");
    setReview({
      key: selectionKey,
      message: [
        "ขอใบเสนอราคารวมสำหรับโรงเรียน",
        `ชื่อโรงเรียน: ${contact.school.trim()}`,
        `ชื่อผู้ติดต่อ: ${contact.person.trim()}`,
        `เบอร์โทร: ${contact.phone.trim()}`,
        `แหล่งงบประมาณ: ${quoteFundingLabel(contact.funding)}`,
        contact.budget && `ช่วงงบประมาณ: ${quoteBudgetLabel(contact.budget)}`,
        ...entries.map(
          ({ name }, index) =>
            `${index + 1}. ${name} · แพ็กเกจโรงเรียน ${schoolPackagePriceLabel} (ประมาณการ)`,
        ),
        `ยอดประเมินเบื้องต้น: ${sum} (ไม่ใช่ราคายืนยัน)`,
        contact.note.trim() && `รายละเอียด: ${contact.note.trim()}`,
      ]
        .filter(Boolean)
        .join("\n"),
    });
  }

  return (
    <section
      className="market-quote-selection"
      aria-labelledby="quote-selection-title"
    >
      <h3 id="quote-selection-title">ตะกร้าใบเสนอราคา ({entries.length})</h3>
      {suggested && (
        <div className="market-links">
          <span>{suggested.name} ยังไม่อยู่ในตะกร้า</span>
          <AddToQuote slug={suggested.slug} />
        </div>
      )}
      {excluded > 0 && (
        <p className="muted">
          มี {excluded} รายการที่บันทึกไว้แต่ไม่อยู่ในแพ็กเกจโรงเรียนชุดนี้
          จึงไม่นำมาประเมินราคา
        </p>
      )}
      {!entries.length ? (
        <p>
          เพิ่มแพ็กเกจได้จาก <Link href="/products">รายการโปรแกรม</Link>{" "}
          แล้วเตรียมขอใบเสนอราคารวมชุด
        </p>
      ) : (
        <>
          <ul className="quote-selection-list">
            {entries.map(({ slug, name }) => (
              <li key={slug}>
                <strong>{name}</strong>
                <p>
                  แพ็กเกจโรงเรียน · {schoolPackagePriceLabel}
                  <br />
                  <small>ประมาณการต่อระบบ</small>
                </p>
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() => {
                    updateQuoteSelection(slug);
                    setReview(undefined);
                  }}
                  aria-label={`นำ ${name} ออก`}
                >
                  นำออก
                </button>
              </li>
            ))}
          </ul>
          {hasLegacyFiles && (
            <p className="muted">
              รายการไฟล์ที่เคยเลือกแสดงเป็นราคาประเมินแพ็กเกจโรงเรียนในหน้านี้เท่านั้น
              ไม่กระทบคำสั่งซื้อเดิม
            </p>
          )}
          <p className="quote-estimate">
            ยอดประเมินเบื้องต้น <strong>{sum}</strong>
          </p>
          <p className="muted">
            {schoolPackageDescription} ยอดนี้ไม่ใช่ราคายืนยัน
            ร้านจะยืนยันขอบเขตและราคาในใบเสนอราคา
          </p>
          <form className="stack" onSubmit={prepare}>
            <label>
              ชื่อโรงเรียน
              <input
                required
                pattern={String.raw`.*\S.*`}
                maxLength={120}
                autoComplete="organization"
                value={contact.school}
                onChange={(event) => set("school", event.target.value)}
              />
            </label>
            <label>
              ชื่อผู้ติดต่อ
              <input
                required
                pattern={String.raw`.*\S.*`}
                maxLength={100}
                autoComplete="name"
                value={contact.person}
                onChange={(event) => set("person", event.target.value)}
              />
            </label>
            <label>
              เบอร์โทร
              <input
                required
                type="tel"
                pattern={String.raw`\+?(?:\d[ .\-]?){7,19}\d`}
                title="ใช้ตัวเลข 8–20 หลัก ใส่เครื่องหมาย + นำหน้า เว้นวรรค หรือขีดได้"
                maxLength={32}
                autoComplete="tel"
                inputMode="tel"
                value={contact.phone}
                onChange={(event) => set("phone", event.target.value)}
              />
            </label>
            <label>
              แหล่งงบประมาณ
              <select
                required
                value={contact.funding}
                onChange={(event) =>
                  set("funding", event.target.value as QuoteFundingSource | "")
                }
              >
                <option value="">เลือกแหล่งงบประมาณ</option>
                {quoteFundingSources.map(({ value, label }) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              ช่วงงบประมาณ (ถ้ามี)
              <select
                value={contact.budget}
                onChange={(event) =>
                  set("budget", event.target.value as QuoteBudget | "")
                }
              >
                <option value="">เลือกช่วงงบประมาณ</option>
                {quoteBudgets.map(({ value, label }) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              รายละเอียดโครงการ (ถ้ามี)
              <textarea
                maxLength={350}
                rows={3}
                value={contact.note}
                onChange={(event) => set("note", event.target.value)}
              />
            </label>
            <p className="muted">
              ข้อมูลติดต่อใช้เตรียมข้อความบนหน้านี้ ไม่ส่งจากเว็บไซต์
              และไม่บันทึกลงตะกร้า
            </p>
            <button type="submit" className="market-primary">
              เตรียมคำขอใบเสนอราคารวม
            </button>
          </form>
          {prepared && (
            <div className="stack market-budget">
              <p role="status">
                เตรียมข้อความแล้ว ยังไม่ได้ส่งให้ {distributor}
              </p>
              <QuoteMessage prepared={prepared} />
              <p>
                คัดลอกข้อความข้างต้น เปิด LINE
                แล้วแทนข้อความตัวอย่างด้วยข้อความที่คัดลอก
                จากนั้นตรวจและกดส่งเอง
              </p>
              <div className="market-links">
                <a
                  className="market-primary"
                  href={quoteLineForPackages(entries.map(({ slug }) => slug))}
                  onClick={() => copyForLine(prepared)}
                  target="_blank"
                  rel="noopener noreferrer"
                  referrerPolicy="no-referrer"
                >
                  เปิด LINE เพื่อส่งคำขอรวม · {lineId}
                </a>
                <a
                  href={lineContact}
                  target="_blank"
                  rel="noopener noreferrer"
                  referrerPolicy="no-referrer"
                >
                  เปิด LINE OA แบบปกติ
                </a>
                <a href={shopPhone.href}>โทรสอบถามร้าน {shopPhone.label}</a>
              </div>
              {lineCopy && (
                <p role="status">
                  {lineCopy === "copied"
                    ? "คัดลอกข้อความฉบับเต็มแล้ว วางแทนสรุปใน LINE ก่อนส่ง"
                    : "คัดลอกอัตโนมัติไม่ได้ ใช้ปุ่มคัดลอกข้อความก่อนวางใน LINE"}
                </p>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}
