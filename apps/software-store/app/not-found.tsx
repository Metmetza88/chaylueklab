import Link from "next/link";
export default function Page() {
  return (
    <section className="empty">
      <h1>ไม่พบหน้าที่ต้องการ</h1>
      <p>ลิงก์อาจเปลี่ยนแปลง กรุณาเลือกโปรแกรมจากหน้าร้าน</p>
      <Link className="btn" href="/products">
        กลับไปดูโปรแกรม
      </Link>
    </section>
  );
}
