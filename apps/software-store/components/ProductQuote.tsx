"use client";

import Link from "next/link";
import { useId, useRef } from "react";
import { DialogTitle } from "./MarketplaceControls";

export default function ProductQuote({
  name,
  description,
  features,
  price,
  ready,
  sport,
}: {
  name: string;
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
            {sport ? "งบโครงการกีฬาสี" : "เอกสารประกอบการจัดซื้อ"}
          </strong>
          <p>
            {ready ? "ราคาตามแคตตาล็อก" : "ราคาเป้าหมาย · ยังไม่เปิดจำหน่าย"}{" "}
            {price}
          </p>
          <p>
            แจ้งขอบเขตงาน จำนวนผู้ใช้ และรายการเอกสารที่โรงเรียนต้องการ
            ทีมงานจะยืนยันราคาและขอบเขตก่อนส่งใบเสนอราคา
          </p>
        </div>
        <div className="market-links">
          <Link
            className="market-primary"
            href={"/contact?program=" + encodeURIComponent(name) + "#quotation"}
            onClick={() => dialog.current?.close()}
          >
            ขอใบเสนอราคา
          </Link>
          <Link
            href="/school-systems#procurement"
            onClick={() => dialog.current?.close()}
          >
            ดูเอกสารเบิกงบ
          </Link>
        </div>
      </dialog>
    </>
  );
}
