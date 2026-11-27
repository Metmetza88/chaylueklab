import Link from "next/link";
import { ArrowUpRight, FileText, ShieldCheck } from "lucide-react";
import {
  demoArea,
  documentDraft,
  forms,
  lineContact,
  lineId,
  procurementPath,
  seller,
  supplyCatalog,
  shopPhone,
  shopPhoneLink,
  supplyLine,
} from "@/lib/procurement";

export function ProcurementBanner() {
  return (
    <section
      className="procurement-banner"
      aria-label="ข้อมูลผู้จัดจำหน่ายและเอกสารจัดซื้อ"
    >
      <div className="container procurement-banner-inner">
        <ShieldCheck size={23} aria-hidden="true" />
        <div>
          <strong>จัดจำหน่ายโดย {seller}</strong>
          <p>
            พัฒนาโดย WORAMET AI LAB · สอบถามเอกสารจัดซื้อในนามร้านก่อนสั่งงาน
          </p>
        </div>
        <Link href={procurementPath}>
          ดูเอกสารจัดซื้อ <ArrowUpRight size={15} />
        </Link>
      </div>
    </section>
  );
}

export function ProcurementDocuments() {
  return (
    <div className="procurement-documents">
      <p>
        ขอใบเสนอราคา รายละเอียดประกอบ TOR ใบส่งมอบงาน
        และใบเสร็จรับเงินได้ตามขอบเขตที่ตกลงกับร้าน
      </p>
      <ul className="procurement-downloads" aria-label="ชุดตัวอย่างเอกสาร">
        {forms.map(({ slug, name }) => (
          <li key={slug}>
            <span>
              <FileText size={17} aria-hidden="true" /> {name}
            </span>
            <div>
              <a
                download
                href={`/documents/procurement/${slug}.pdf`}
                aria-label={`ดาวน์โหลด PDF ${name}`}
              >
                PDF
              </a>
              <a
                download
                href={`/documents/procurement/${slug}.docx`}
                aria-label={`ดาวน์โหลด Word ${name}`}
              >
                Word
              </a>
            </div>
          </li>
        ))}
      </ul>
      <p className="muted">
        ไฟล์เป็นแบบร่าง ไม่ใช่เอกสารออกจริง โรงเรียนเป็นผู้เลือกวิธีจัดซื้อ
        รวมถึงวิธีเฉพาะเจาะจงเมื่อเข้าเงื่อนไข
      </p>
      <a
        className="market-primary"
        href={documentDraft}
        target="_blank"
        rel="noopener noreferrer"
      >
        ขอไฟล์ตัวอย่างทาง LINE
      </a>
    </div>
  );
}

export function DirectContact() {
  return (
    <div className="procurement-contact">
      <p>
        <strong>
          LINE OA:{" "}
          <a href={lineContact} target="_blank" rel="noopener noreferrer">
            {lineId}
          </a>
        </strong>
      </p>
      <p>{demoArea}</p>
      <p>
        โทรศัพท์ร้านในสตึก: <a href={shopPhoneLink}>{shopPhone}</a>
      </p>
    </div>
  );
}

export function SuppliesPanel() {
  return (
    <section className="panel supplies-panel" aria-labelledby="supply-title">
      <span className="eyebrow">{seller} · สตึก, บุรีรัมย์</span>
      <h2 id="supply-title">อุปกรณ์การเรียน &amp; พัสดุสำนักงาน</h2>
      <p>
        สอบถามชุดอุปกรณ์การเรียน กระดาษ A4 พัสดุสำนักงาน และอุปกรณ์กีฬาสี
        หรือแจ้งว่าต้องการประเมินราคาร่วมกับระบบโรงเรียน
      </p>
      <div className="market-links">
        <a className="market-primary" href={supplyCatalog}>
          ดูหน้าร้าน พ.สมนึก 2&amp;3 <ArrowUpRight size={15} />
        </a>
        <a href={supplyLine} target="_blank" rel="noopener noreferrer">
          สอบถามรายการและสต๊อกกับร้านทาง LINE
        </a>
      </div>
    </section>
  );
}
