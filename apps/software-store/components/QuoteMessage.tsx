"use client";

import { useId, useRef, useState } from "react";
import { Copy } from "lucide-react";

export default function QuoteMessage({
  product,
  prepared,
  draft,
}: {
  product?: string;
  prepared?: string;
  draft?: string;
}) {
  const id = useId();
  const field = useRef<HTMLTextAreaElement>(null);
  const [status, setStatus] = useState("");
  const message =
    prepared ??
    draft ??
    [
      "ขอใบเสนอราคาสำหรับโรงเรียน",
      `ระบบที่สนใจ: ${product ?? ""}`,
      "ชื่อสถานศึกษา:",
      "ขอบเขตงาน / จำนวนผู้ใช้:",
      "ช่วงที่ต้องการใช้งาน:",
      "เอกสารที่ต้องใช้ / อีเมลหน่วยงาน:",
    ].join("\n");

  async function copyMessage() {
    try {
      await navigator.clipboard.writeText(field.current?.value ?? message);
      setStatus("คัดลอกข้อความแล้ว");
    } catch {
      const input = field.current;
      input?.focus();
      input?.select();
      input?.setSelectionRange(0, input.value.length);
      setStatus("เลือกข้อความแล้ว สามารถคัดลอกได้จากเมนูของอุปกรณ์");
    }
  }

  return (
    <div className="market-quote-message">
      <label htmlFor={id}>ข้อความสำหรับส่งทาง LINE</label>
      <textarea
        key={message}
        id={id}
        ref={field}
        defaultValue={message}
        readOnly={Boolean(prepared)}
        rows={draft ? 7 : 6}
        maxLength={1500}
      />
      <button className="btn ghost" type="button" onClick={copyMessage}>
        <Copy size={18} /> คัดลอกข้อความ
      </button>
      {status && <p role="status">{status}</p>}
    </div>
  );
}
