import Link from "next/link";
import { getViewer } from "@/lib/shop";
export default async function Page() {
  const { isVip } = await getViewer();
  return (
    <section className="prose">
      <span className="eyebrow">WORAMET MEMBERSHIP</span>
      <h1>สมาชิก VIP</h1>
      <p>จัดการสิทธิ์โปรแกรมที่ร่วมรายการในบัญชีเดียว</p>
      <div className="panel">
        <h2>
          {isVip ? "บัญชีของคุณมีสิทธิ์ VIP" : "เตรียมพบกับแผนสมาชิก VIP"}
        </h2>
        <p>
          การสมัครและชำระค่า VIP ยังไม่เปิดให้บริการ
          ราคาและรายการสินค้าที่ร่วมแผนจะประกาศเมื่อผ่านการตรวจรับแล้ว
          ไม่มีการเรียกเก็บหรือต่ออายุอัตโนมัติ
        </p>
        <Link className="btn ghost" href={isVip ? "/downloads" : "/contact"}>
          {isVip ? "ดูสิทธิ์ดาวน์โหลด" : "สอบถามรายละเอียด"} →
        </Link>
      </div>
    </section>
  );
}
