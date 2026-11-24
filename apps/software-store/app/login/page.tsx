import Link from "next/link";
import { authenticate } from "@/app/actions";
import ActionForm from "@/components/ActionForm";
export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const sp = await searchParams;
  return (
    <section className="auth-card panel">
      <span className="eyebrow">YOUR WORKSPACE</span>
      <h1>ยินดีต้อนรับกลับ</h1>
      <p className="muted">
        เข้าสู่ระบบเพื่อจัดการคำสั่งซื้อและดาวน์โหลดโปรแกรม
      </p>
      <ActionForm action={authenticate} label="เข้าสู่ระบบ">
        <input type="hidden" name="mode" value="login" />
        <input type="hidden" name="next" value={sp.next ?? "/orders"} />
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
          รหัสผ่าน
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            required
            minLength={12}
            maxLength={128}
          />
        </label>
      </ActionForm>
      <div className="row spaced">
        <Link href="/register">สมัครสมาชิก</Link>
        <Link href="/forgot-password">ลืมรหัสผ่าน</Link>
      </div>
    </section>
  );
}
