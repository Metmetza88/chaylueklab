"use client";

import Link from "next/link";
import { useId, useRef } from "react";
import { type productOffer, quoteHref } from "@/lib/marketplace";
import { StoreDialog } from "./StoreDialogs";
import { DialogTitle } from "./MarketplaceControls";

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
  offer: ReturnType<typeof productOffer>;
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
            <strong>{price}</strong>
            <span>
              {offer === "ready"
                ? "ราคาตามแคตตาล็อก"
                : offer === "school-order"
                  ? "แพ็กเกจโรงเรียน · ยืนยันตามขอบเขตงาน"
                  : "แผนพัฒนา · ยังไม่เปิดจำหน่าย"}
            </span>
          </p>
          {sport && offer === "school-order" && (
            <p>ระบบกีฬาสีพร้อมออกเกียรติบัตรออนไลน์</p>
          )}
          <p>
            แจ้งขอบเขตงาน จำนวนผู้ใช้ และรายการเอกสารที่โรงเรียนต้องการ
            ทีมงานจะยืนยันราคาและขอบเขตก่อนส่งใบเสนอราคา
          </p>
        </div>
        <div className="market-links">
          <Link
            className="market-primary"
            href={quoteHref(slug)}
            onClick={() => dialog.current?.close()}
          >
            ขอใบเสนอราคา
          </Link>
          <StoreDialog kind="procurement" />
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
              ทดลองระบบ
            </Link>
          )}
        </div>
      </dialog>
    </>
  );
}
