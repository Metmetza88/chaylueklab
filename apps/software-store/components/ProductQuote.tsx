"use client";

import Link from "next/link";
import { useId, useRef } from "react";
import { quoteHref } from "@/lib/marketplace";
import {
  isSchoolPackage,
  schoolPackagePriceLabel,
} from "@/lib/school-packages";
import { DialogTitle, StoreDialogButton } from "./StoreDialogs";
import { AddToQuote, QuoteCartLink } from "./QuoteSelection";
import {
  distributor,
  lineId,
  shopLocation,
  shopPhone,
} from "@/lib/procurement";

export default function ProductQuote({
  slug,
  name,
  hasDemo,
  description,
  features,
  sport,
}: {
  slug: string;
  name: string;
  hasDemo: boolean;
  description: string;
  features: string[];
  sport: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const title = useId();
  const schoolPackage = isSchoolPackage(slug);

  return (
    <>
      <button
        ref={trigger}
        className="market-primary market-card-cta"
        type="button"
        aria-haspopup="dialog"
        onClick={() => dialog.current?.showModal()}
      >
        {schoolPackage ? "ดูรายละเอียด / ขอใบเสนอราคา" : "ดูรายละเอียด"}
      </button>
      <dialog
        ref={dialog}
        className="market-dialog"
        aria-labelledby={title}
        onClose={() => {
          if (
            document.activeElement === dialog.current ||
            document.activeElement === document.body
          ) {
            trigger.current?.focus();
          }
        }}
      >
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
          {schoolPackage && (
            <p className="market-quote-price">
              <strong>{schoolPackagePriceLabel}</strong>
              <span>งบประเมินต่อระบบ · ประเมินตามขอบเขตงาน</span>
            </p>
          )}
          <p>
            แจ้งขอบเขตงาน จำนวนผู้ใช้ และรายการเอกสารที่โรงเรียนต้องการ
            ทีมงานจะยืนยันราคา ขอบเขต และกำหนดส่งก่อนรับงาน
          </p>
        </div>
        {schoolPackage && (
          <div className="market-budget">
            <strong>แพ็กเกจระบบโรงเรียนพร้อมติดตั้ง</strong>
            <p>
              รวมติดตั้ง ตั้งค่าตามขอบเขต แนะนำการใช้งาน และเอกสารตามข้อตกลง
            </p>
            <div className="market-links">
              <AddToQuote slug={slug} />
              <QuoteCartLink />
            </div>
          </div>
        )}
        <p>
          ออกเอกสารในนาม {distributor} · {shopLocation} ·{" "}
          <a href={shopPhone.href}>โทร {shopPhone.label}</a> · LINE OA {lineId}
        </p>
        <p className="muted">
          เอกสารประกอบการจัดซื้อเป็นไปตามเงื่อนไขที่สถานศึกษากำหนด
          โรงเรียนเป็นผู้ตรวจสอบและอนุมัติการเบิกจ่าย
        </p>
        <div className="market-links">
          <Link
            className="market-primary"
            href={schoolPackage ? quoteHref(slug) : "/contact"}
            onClick={() => dialog.current?.close()}
          >
            {schoolPackage ? "ขอใบเสนอราคา" : "ติดต่อสอบถาม"}
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
