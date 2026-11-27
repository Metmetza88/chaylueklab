"use client";

import Link from "next/link";
import { useId, useRef } from "react";
import { QuotePackages } from "./QuoteCart";
import { procurementHref } from "@/lib/marketplace";
import { DialogTitle } from "./MarketplaceControls";

export default function ProductQuote({
  slug,
  name,
  hasDemo,
  seller,
  description,
  features,
  price,
  ready,
  sport,
}: {
  slug: string;
  name: string;
  hasDemo: boolean;
  seller: React.ReactNode;
  description: string;
  features: string[];
  price: string;
  ready: boolean;
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
              {ready
                ? "ราคาตามแคตตาล็อก"
                : "ราคาเป้าหมาย · ขอประเมินการติดตั้ง"}
            </span>
          </p>
          <p>
            แจ้งขอบเขตงาน จำนวนผู้ใช้ และรายการเอกสารที่โรงเรียนต้องการ
            ทีมงานจะยืนยันราคาและขอบเขตก่อนส่งใบเสนอราคา
          </p>
        </div>
        <QuotePackages
          slug={slug}
          price={price}
          close={() => dialog.current?.close()}
        />
        {seller}
        <div className="market-links">
          <Link href={procurementHref} onClick={() => dialog.current?.close()}>
            ดูเอกสารเบิกงบ
          </Link>
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
