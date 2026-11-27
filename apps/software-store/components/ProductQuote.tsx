"use client";

import Link from "next/link";
import { useId, useRef, useState } from "react";
import { quoteHref } from "@/lib/marketplace";
import type { storeOffer } from "@/lib/store-offers";
import { DialogTitle, StoreDialogButton } from "./StoreDialogs";
import {
  AddToQuote,
  PackageChoice,
  PackageDetails,
  QuoteCartLink,
  useQuoteSelection,
} from "./QuoteSelection";
import {
  distributor,
  lineId,
  shopLocation,
  shopPhone,
} from "@/lib/procurement";
import type { QuotePlan } from "@/lib/quote";

export default function ProductQuote({
  slug,
  name,
  hasDemo,
  description,
  features,
  price,
  offer,
  sport,
}: {
  slug: string;
  name: string;
  hasDemo: boolean;
  description: string;
  features: string[];
  price: string;
  offer: ReturnType<typeof storeOffer>;
  sport: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const title = useId();
  const selected = useQuoteSelection();
  const [plan, setPlan] = useState<QuotePlan>("files");
  return (
    <>
      <button
        className="market-primary market-card-cta"
        type="button"
        aria-haspopup="dialog"
        onClick={() => {
          setPlan(selected[slug] ?? "files");
          dialog.current?.showModal();
        }}
      >
        ดูรายละเอียด / ขอใบเสนอราคา
      </button>
      <dialog ref={dialog} className="market-dialog" aria-labelledby={title}>
        <DialogTitle id={title} title={name} />
        <p>{description}</p>
        {features.length > 0 && (
          <ul>
            {features.map((feature) => (
              <li key={feature}>{feature}</li>
            ))}
          </ul>
        )}
        <div className="market-budget">
          <strong>
            {sport
              ? "เอกสารประกอบการเบิกงบโครงการกีฬาสี"
              : "เอกสารประกอบการเบิกงบโครงการ"}
          </strong>
          <p className="market-quote-price">
            <strong>{offer.kind === "order" ? offer.label : price}</strong>
            <span>{offer.priceLabel}</span>
          </p>
          <p>
            แจ้งขอบเขตงาน จำนวนผู้ใช้ และรายการเอกสารที่โรงเรียนต้องการ
            ทีมงานจะยืนยันราคาและขอบเขตก่อนส่งใบเสนอราคา
          </p>
        </div>
        <div className="market-budget">
          <PackageChoice value={plan} onChange={setPlan} filesPrice={price} />
          <PackageDetails plan={plan} />
          <div className="market-links">
            <AddToQuote slug={slug} plan={plan} />
            <QuoteCartLink />
          </div>
        </div>
        <p>
          ออกเอกสารในนาม {distributor} · {shopLocation} ·{" "}
          <a href={shopPhone.href}>โทร {shopPhone.label}</a> · LINE OA {lineId}
        </p>
        <p className="muted">
          รองรับการจัดซื้อวิธีเฉพาะเจาะจงตามระเบียบและเงื่อนไขที่สถานศึกษากำหนด
        </p>
        <div className="market-links">
          <Link
            className="market-primary"
            href={quoteHref(slug)}
            onClick={() => dialog.current?.close()}
          >
            ขอใบเสนอราคา
          </Link>
          <StoreDialogButton
            name="procurement"
            beforeOpen={() => dialog.current?.close()}
          >
            ดูเอกสารเบิกงบ
          </StoreDialogButton>
          <Link
            href={`/products/${slug}`}
            onClick={() => dialog.current?.close()}
          >
            ดูข้อมูลระบบฉบับเต็ม
          </Link>
          {hasDemo && (
            <Link
              href={`/demo/${slug}`}
              onClick={() => dialog.current?.close()}
            >
              ทดลองดูตัวอย่าง (Demo)
            </Link>
          )}
        </div>
      </dialog>
    </>
  );
}
