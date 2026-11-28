import { FileText } from "lucide-react";
import {
  addFriendLine,
  procurementLine,
  procurementTemplates,
} from "@/lib/procurement";

export default function ProcurementDocuments() {
  return (
    <>
      <p>รายการเอกสารให้ตกลงกับโรงเรียนก่อนเริ่มงาน</p>
      <ul className="procurement-issue-list">
        <li>ใบเสนอราคา</li>
        <li>รายละเอียดและสเปกประกอบ TOR วิธีเฉพาะเจาะจง</li>
        <li>บันทึกข้อความขออนุมัติโครงการ</li>
        <li>ใบส่งมอบงาน</li>
        <li>ใบเสร็จรับเงิน</li>
      </ul>
      <h3>ดาวน์โหลดชุดตัวอย่างเอกสารเบิกงบ</h3>
      <p className="muted">
        เลือก PDF สำหรับอ่าน หรือ Word
        สำหรับแก้ไขชื่อโรงเรียนและรายละเอียดโครงการ
      </p>
      <ul className="procurement-downloads">
        {procurementTemplates.map(({ slug, name }) => (
          <li key={slug}>
            <span>
              <FileText size={17} aria-hidden="true" /> {name}
            </span>
            <div className="market-links">
              <a
                href={`/documents/procurement/${slug}.pdf`}
                download
                aria-label={`ดาวน์โหลด PDF ${name}`}
              >
                PDF
              </a>
              <a
                href={`/documents/procurement/${slug}.docx`}
                download
                aria-label={`ดาวน์โหลด Word ${name}`}
              >
                Word
              </a>
            </div>
          </li>
        ))}
      </ul>
      <div className="market-links">
        <a
          className="market-primary"
          href={procurementLine}
          target="_blank"
          rel="noopener noreferrer"
        >
          ขอรับไฟล์ตัวอย่างทาง LINE
        </a>
        <a href={addFriendLine} target="_blank" rel="noopener noreferrer">
          เพิ่มเพื่อน LINE OA
        </a>
      </div>
    </>
  );
}
