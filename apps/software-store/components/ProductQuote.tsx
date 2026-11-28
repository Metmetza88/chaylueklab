"use client";

import Link from "next/link";
import { useId, useRef } from "react";
import { quoteHref } from "@/lib/marketplace";
import type { storeOffer } from "@/lib/store-offers";
import { DialogTitle, StoreDialogButton } from "./StoreDialogs";
import { AddToQuote, QuoteCartLink } from "./QuoteSelection";
import {
  distributor,
  lineId,
  shopLocation,
  shopPhone,
} from "@/lib/procurement";
import SchoolPackage from "./SchoolPackage";

export default function ProductQuote({
  slug,
  name,
  description,
  features,
  offer,
  sport,
}: {
  slug: string;
  name: string;
  description: string;
  features: string[];
  offer: ReturnType<typeof storeOffer>;
  sport: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const title = useId();
  return (
    <>
      <button
        className="market-primary market-card-cta"
        type="button"
        aria-haspopup="dialog"
        onClick={() => dialog.current?.showModal()}
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
            <strong>{offer.label}</strong>
          </p>
          <p>
            แจ้งขอบเขตงาน จำนวนผู้ใช้ และรายการเอกสารที่โรงเรียนต้องการ
            ทีมงานจะยืนยันราคาและขอบเขตก่อนส่งใบเสนอราคา
          </p>
        </div>
        <SchoolPackage slug={slug} />
        <div className="market-links">
          <AddToQuote slug={slug} />
          <QuoteCartLink />
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
          <Link href={`/demo/${slug}`} onClick={() => dialog.current?.close()}>
            เปิดเดโมเต็มหน้า
          </Link>
        </div>
      </dialog>
    </>
  );
}
