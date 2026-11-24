import Link from "next/link";
export default function Page() {
  return (
    <section className="prose">
      <span className="eyebrow">WORAMET AI LAB</span>
      <h1>ติดต่อเรา</h1>
      <p>
        สอบถามโปรแกรม การติดตั้ง สิทธิ์ใช้งาน หรือการจัดการข้อมูลส่วนบุคคล
        ผ่านช่องทางของ CHAYLUEKLAB
      </p>
      <div className="panel stack">
        <a
          className="btn"
          href="https://line.me/R/ti/p/@215pcisl"
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
        <Link href="/support">ส่งคำขอช่วยเหลือในระบบ →</Link>
      </div>
      <p className="muted">
        อย่าส่งรหัสผ่าน ข้อมูลบัตร หรือเอกสารของนักเรียนผ่านแชต ช่องทาง LINE
        เป็นลิงก์จาก Repository เดิม
        ส่วนการแจ้งเตือนอัตโนมัติยังต้องตั้งค่าและทดสอบก่อนเปิดใช้งาน
      </p>
    </section>
  );
}
