import Link from "next/link";
import { DirectContact } from "@/components/Procurement";
import { lineContact, lineId, quoteDraft } from "@/lib/procurement";
import { configured } from "@/lib/env";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ program?: string | string[] }>;
}) {
  const { program } = await searchParams;
  const programName =
    typeof program === "string" ? program.trim().slice(0, 120) : "";
  return (
    <section className="prose">
      <span className="eyebrow">WORAMET AI LAB</span>
      <h1>ติดต่อเรา</h1>
      <DirectContact />
      <p>
        ขอประเมินงาน ติดตั้งระบบ หรือสอบถามโปรแกรมโรงเรียนผ่าน LINE ของ
        CHAYLUEKLAB
      </p>
      <p>
        แจ้งชื่อโปรแกรมที่สนใจ จำนวนผู้ใช้งานโดยประมาณ
        และงานที่ต้องการให้ระบบช่วย
      </p>
      <div className="panel stack" id="quotation">
        <h2>ขอใบเสนอราคา</h2>
        {programName && (
          <p>
            โปรแกรมที่สนใจ <strong>{programName}</strong>
          </p>
        )}
        <p>
          แจ้งชื่อโรงเรียน จำนวนผู้ใช้ ขอบเขตโครงการ และเอกสารที่ต้องการผ่าน
          LINE
        </p>
        <a
          className="btn"
          href={programName ? quoteDraft(programName) : lineContact}
          target="_blank"
          rel="noopener noreferrer"
        >
          {programName
            ? "เปิดร่างข้อความขอราคาทาง LINE ↗"
            : `เปิด LINE OA ${lineId} ↗`}
        </a>
        {programName && (
          <a href={lineContact} target="_blank" rel="noopener noreferrer">
            เปิดแชต LINE แบบไม่ใส่ข้อความ
          </a>
        )}
        <a
          href="https://chaylueklab.com"
          target="_blank"
          rel="noopener noreferrer"
        >
          เว็บไซต์หลัก CHAYLUEKLAB ↗
        </a>
        {configured() && <Link href="/support">ส่งคำขอช่วยเหลือในระบบ</Link>}
      </div>
      <p className="muted">
        กรุณางดส่งรหัสผ่าน ข้อมูลบัตร หรือเอกสารของนักเรียนผ่านแชต
      </p>
    </section>
  );
}
