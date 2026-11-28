import ActionForm from "@/components/ActionForm";
import { resetPassword } from "@/app/actions";
export default function Page() {
  return (
    <section className="panel auth-card">
      <h1>ลืมรหัสผ่าน</h1>
      <ActionForm action={resetPassword} label="ส่งอีเมล">
        <label>
          อีเมล
          <input type="email" name="email" required autoComplete="email" />
        </label>
      </ActionForm>
    </section>
  );
}
