import Link from "next/link";
import { authenticate } from "@/app/actions";
import ActionForm from "@/components/ActionForm";
export default function Register() {
  return (
    <section className="auth-card panel">
      <span className="eyebrow">START WITH WORAMET</span>
      <h1>สร้างบัญชีของคุณ</h1>
      <p className="muted">
        ดูประวัติคำสั่งซื้อ รับไฟล์โปรแกรม และขอความช่วยเหลือในที่เดียว
      </p>
      <ActionForm action={authenticate} label="สมัครสมาชิก">
        <input type="hidden" name="mode" value="signup" />
        <label>
          อีเมล
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            maxLength={254}
          />
        </label>
        <label>
          รหัสผ่านอย่างน้อย 12 ตัวอักษร
          <input
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={12}
            maxLength={128}
          />
        </label>
        <label className="check">
          <input type="checkbox" name="consent" required />
          ยอมรับ <Link href="/terms">เงื่อนไขการใช้บริการ</Link> และ{" "}
          <Link href="/privacy">นโยบายความเป็นส่วนตัว</Link>
        </label>
      </ActionForm>
      <Link href="/login">มีบัญชีแล้ว เข้าสู่ระบบ</Link>
    </section>
  );
}
