"use client";

import Link from "next/link";
import { FileText, Mail, ShieldCheck } from "lucide-react";
import { useId, useRef, type ReactNode } from "react";
import {
  lineContact,
  lineId,
  procurementHref,
  quoteHref,
  schoolDemoArea,
} from "@/lib/marketplace";

const templates = [
  ["ใบเสนอราคา", "quotation"],
  ["ขอบเขตงาน (TOR) สำหรับวิธีเฉพาะเจาะจง", "terms-of-reference"],
  ["บันทึกข้อความขออนุมัติโครงการ", "approval-memo"],
];

export function ContactDetails() {
  const phone = process.env.NEXT_PUBLIC_STORE_CONTACT_PHONE?.trim();
  const phoneHref = phone?.replace(/[\s()-]/g, "");
  return (
    <div className="store-contact-details">
      <p>
        ติดต่อด่วน <a href={lineContact}>LINE OA {lineId}</a>
      </p>
      {phoneHref && /^\+?\d{9,15}$/.test(phoneHref) && (
        <p>
          โทร <a href={`tel:${phoneHref}`}>{phone}</a>
        </p>
      )}
      <p>{schoolDemoArea}</p>
    </div>
  );
}

export function StoreDialog({
  kind,
  children,
  className,
}: {
  kind: "procurement" | "contact";
  children?: ReactNode;
  className?: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const title = useId();
  const procurement = kind === "procurement";
  const label = procurement ? "เอกสารเบิกงบ" : "ติดต่อเรา";
  return (
    <>
      <button
        type="button"
        className={className}
        aria-label={label}
        aria-haspopup="dialog"
        onClick={() => dialog.current?.showModal()}
      >
        {children ?? label}
      </button>
      <dialog ref={dialog} className="market-dialog" aria-labelledby={title}>
        <div className="market-dialog-title">
          <h2 id={title}>{label}</h2>
          <div>
            <button type="button" onClick={() => dialog.current?.close()} className="market-close" aria-label="ปิดหน้าต่าง">
              ×
            </button>
          </div>
        </div>
        {procurement ? (
          <>
            <p>
              ร้าน พ.สมนึก 2&3 จัดทำเอกสารตามรายการและขั้นตอนที่ตกลงกับโรงเรียน
            </p>
            <ul className="store-document-list">
              <li>ใบเสนอราคา</li>
              <li>รายละเอียดสเปกสำหรับประกอบร่าง TOR</li>
              <li>ใบส่งมอบงาน</li>
              <li>ใบเสร็จรับเงิน</li>
            </ul>
            <h3>ดาวน์โหลดตัวอย่างเอกสารเบิกงบ</h3>
            <p>
              แก้ชื่อโรงเรียนและรายละเอียดในไฟล์ Word
              แล้วให้เจ้าหน้าที่พัสดุตรวจทานก่อนใช้
            </p>
            <ul className="store-template-list">
              {templates.map(([name, slug]) => (
                <li key={slug}>
                  <span>{name}</span>
                  <a
                    download
                    href={`/procurement/${slug}.pdf`}
                    aria-label={`ดาวน์โหลด PDF ${name}`}
                  >
                    PDF
                  </a>
                  <a
                    download
                    href={`/procurement/${slug}.docx`}
                    aria-label={`ดาวน์โหลด Word ${name}`}
                  >
                    Word
                  </a>
                </li>
              ))}
            </ul>
            <div className="market-links">
              <a
                className="market-primary"
                href={lineContact}
                target="_blank"
                rel="noopener noreferrer"
              >
                ขอรับไฟล์ตัวอย่างทาง LINE {lineId}
              </a>
              <Link
                href={procurementHref}
                onClick={() => dialog.current?.close()}
              >
                อ่านข้อมูลจัดซื้อเพิ่มเติม
              </Link>
            </div>
          </>
        ) : (
          <>
            <ContactDetails />
            <div className="market-links">
              <a
                className="market-primary"
                href={lineContact}
                target="_blank"
                rel="noopener noreferrer"
              >
                เปิด LINE OA
              </a>
              <Link href={quoteHref()} onClick={() => dialog.current?.close()}>
                เปิดหน้าติดต่อและขอใบเสนอราคา
              </Link>
            </div>
          </>
        )}
      </dialog>
    </>
  );
}

export function ProcurementBanner() {
  return (
    <aside
      className="container store-procurement"
      aria-label="เอกสารจัดซื้อสำหรับโรงเรียน"
    >
      <ShieldCheck aria-hidden="true" />
      <div>
        <strong>จัดจำหน่ายและออกเอกสารในนาม ร้าน พ.สมนึก 2&3</strong>
        <p>
          พัฒนาโดย WORAMET AI LAB ·
          รองรับเอกสารประกอบการจัดซื้อวิธีเฉพาะเจาะจงตามที่โรงเรียนกำหนด
        </p>
      </div>
      <StoreDialog kind="procurement" className="btn ghost">
        <FileText size={17} aria-hidden="true" /> เอกสารเบิกงบ
      </StoreDialog>
    </aside>
  );
}

export function ContactDialogIcon() {
  return (
    <StoreDialog kind="contact">
      <Mail size={19} />
    </StoreDialog>
  );
}
