"use client";

import { useRef, useState } from "react";
import { Copy } from "lucide-react";

export default function QuoteMessage({
  product,
  price,
}: {
  product?: string;
  price?: string;
}) {
  const field = useRef<HTMLTextAreaElement>(null);
  const [status, setStatus] = useState("");
  const message = [
    "ขอใบเสนอราคาสำหรับโรงเรียน",
    `ระบบที่สนใจ: ${product ?? ""}`,
    ...(price ? [`ราคาแพ็กเกจ: ${price}`] : []),
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
      field.current?.focus();
      field.current?.select();
      setStatus("เลือกข้อความแล้ว สามารถคัดลอกได้จากเมนูของอุปกรณ์");
    }
  }

  return (
    <div className="market-quote-message">
      <label htmlFor="school-quote-message">ข้อความสำหรับส่งทาง LINE</label>
      <textarea
        key={product}
        id="school-quote-message"
        ref={field}
        defaultValue={message}
        rows={6}
        maxLength={1500}
      />
      <button className="btn ghost" type="button" onClick={copyMessage}>
        <Copy size={18} /> คัดลอกข้อความ
      </button>
      {status && <p role="status">{status}</p>}
    </div>
  );
}
