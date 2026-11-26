import Link from "next/link";
import { configured } from "@/lib/env";

export default function Page() {
  return (
    <section className="prose">
      <span className="eyebrow">WORAMET AI LAB</span>
      <h1>ติดต่อเรา</h1>
      <p>
        ขอประเมินงาน ติดตั้งระบบ หรือสอบถามโปรแกรมโรงเรียนผ่าน LINE ของ
        CHAYLUEKLAB
      </p>
      <p>
        แจ้งชื่อโปรแกรมที่สนใจ จำนวนผู้ใช้งานโดยประมาณ
        และงานที่ต้องการให้ระบบช่วย
      </p>
      <div className="panel stack">
        <a
          className="btn"
          href="https://lin.ee/Vgg2m3N"
          target="_blank"
          rel="noopener noreferrer"
        >
          เปิด LINE Official Account ↗
        </a>
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
