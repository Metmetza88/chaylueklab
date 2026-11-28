"use client";

import Link from "next/link";
import { createContext, useContext, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { lineContact, procurementHref } from "@/lib/marketplace";
import {
  lineId,
  localService,
  shopPhone,
  storeInquiryLine,
} from "@/lib/procurement";
import ProcurementDocuments from "./ProcurementDocuments";

type DialogName = "procurement" | "contact";

const StoreDialogContext = createContext<(name: DialogName) => void>(() => {});

export function StoreDialogButton({
  name,
  children,
  className,
  label,
  beforeOpen,
}: {
  name: DialogName;
  children: ReactNode;
  className?: string;
  label?: string;
  beforeOpen?: () => void;
}) {
  const open = useContext(StoreDialogContext);
  return (
    <button
      type="button"
      className={className}
      aria-label={label}
      aria-haspopup="dialog"
      aria-controls={`store-${name}-dialog`}
      onClick={() => {
        beforeOpen?.();
        open(name);
      }}
    >
      {children}
    </button>
  );
}

export function DialogTitle({ id, title }: { id: string; title: string }) {
  return (
    <div className="market-dialog-title">
      <h2 id={id}>{title}</h2>
      <form method="dialog">
        <button className="market-close" aria-label="ปิดหน้าต่าง">
          <X size={20} />
        </button>
      </form>
    </div>
  );
}

export default function StoreDialogs({ children }: { children: ReactNode }) {
  const procurement = useRef<HTMLDialogElement>(null);
  const contact = useRef<HTMLDialogElement>(null);
  return (
    <StoreDialogContext.Provider
      value={(name) =>
        (name === "procurement" ? procurement : contact).current?.showModal()
      }
    >
      {children}
      <dialog
        ref={procurement}
        id="store-procurement-dialog"
        className="market-dialog"
        aria-labelledby="store-procurement-title"
      >
        <DialogTitle id="store-procurement-title" title="เอกสารเบิกงบ" />
        <ProcurementDocuments />
        <p>
          <Link
            href={procurementHref}
            onClick={() => procurement.current?.close()}
          >
            รายละเอียดการจัดซื้อและแบบฟอร์ม .ac.th
          </Link>
        </p>
      </dialog>
      <dialog
        ref={contact}
        id="store-contact-dialog"
        className="market-dialog"
        aria-labelledby="store-contact-title"
      >
        <DialogTitle id="store-contact-title" title="ติดต่อเรา" />
        <p>{localService}</p>
        <div className="market-links">
          <a
            className="market-primary"
            href={storeInquiryLine}
            target="_blank"
            rel="noopener noreferrer"
            referrerPolicy="no-referrer"
          >
            LINE OA {lineId}
          </a>
          <a
            href={lineContact}
            target="_blank"
            rel="noopener noreferrer"
            referrerPolicy="no-referrer"
          >
            เพิ่มเพื่อน LINE OA
          </a>
          <a href={shopPhone.href}>โทรสอบถามร้าน {shopPhone.label}</a>
          <Link
            href="/contact#quotation"
            onClick={() => contact.current?.close()}
          >
            ขอใบเสนอราคา
          </Link>
        </div>
      </dialog>
    </StoreDialogContext.Provider>
  );
}
