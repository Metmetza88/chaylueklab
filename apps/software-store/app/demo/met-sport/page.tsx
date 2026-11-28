import Link from "next/link";
import SportDemo from "@/components/SportDemo";
import { quoteHref } from "@/lib/marketplace";

export default function Page() {
  return (
    <section className="section stack">
      <div className="demo-bar">เดโม · ข้อมูลสมมติ</div>
      <h1>ทดลองระบบจัดการแข่งขันกีฬาสี</h1>
      <p className="muted">
        เลือกการแข่งขัน บันทึกคะแนนคณะสี และดูผลรวม
        คะแนนจะเริ่มใหม่เมื่อโหลดหน้าอีกครั้ง
      </p>
      <SportDemo />
      <div className="row">
        <Link href="/demo">ดูเดโมทั้งหมด</Link>
        <Link className="btn ghost" href={quoteHref("met-sport")}>
          ขอใบเสนอราคา
        </Link>
      </div>
    </section>
  );
}
