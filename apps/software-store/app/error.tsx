"use client";
export default function Error({ reset }: { reset: () => void }) {
  return (
    <section className="empty">
      <h1>เชื่อมต่อระบบไม่สำเร็จ</h1>
      <p>กรุณาลองใหม่ หรือติดต่อผู้ดูแลหากปัญหายังคงอยู่</p>
      <button className="btn" onClick={reset}>
        ลองใหม่
      </button>
    </section>
  );
}
