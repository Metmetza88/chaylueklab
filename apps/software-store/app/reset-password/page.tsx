import ActionForm from "@/components/ActionForm";
import { updatePassword } from "@/app/actions";
export default function Page() {
  return (
    <section className="panel auth-card">
      <h1>ตั้งรหัสผ่านใหม่</h1>
      <ActionForm action={updatePassword}>
        <label>
          รหัสผ่านใหม่
          <input
            type="password"
            name="password"
            required
            minLength={12}
            maxLength={128}
            autoComplete="new-password"
          />
        </label>
      </ActionForm>
    </section>
  );
}
