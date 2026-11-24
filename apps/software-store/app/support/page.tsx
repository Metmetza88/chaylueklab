import Link from "next/link";
import { getViewer } from "@/lib/shop";
import { createClient } from "@/lib/supabase/server";
import ActionForm from "@/components/ActionForm";
import { supportTicket } from "@/app/actions";
export default async function Page() {
  const { user } = await getViewer();
  const data = user
    ? (
        await (await createClient())
          .from("store_support")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
      ).data
    : [];
  return (
    <section className="section">
      <span className="eyebrow">WE’RE HERE TO HELP</span>
      <h1>แจ้งปัญหาและขอความช่วยเหลือ</h1>
      <p className="muted">
        ระบุโปรแกรม เวอร์ชัน และขั้นตอนที่พบปัญหา ห้ามแนบรหัสผ่าน API Key
        หรือข้อมูลนักเรียน
      </p>
      {user ? (
        <div className="info-grid">
          <div className="panel">
            <ActionForm action={supportTicket} label="ส่งคำขอช่วยเหลือ">
              <label>
                เรื่อง
                <input name="subject" minLength={3} maxLength={150} required />
              </label>
              <label>
                รายละเอียด
                <textarea
                  name="message"
                  minLength={10}
                  maxLength={5000}
                  required
                />
              </label>
            </ActionForm>
          </div>
          <div className="stack">
            {data?.map((t) => (
              <article className="panel" key={t.id}>
                <span className="status">{t.status}</span>
                <h3>{t.subject}</h3>
                <p style={{ whiteSpace: "pre-wrap" }}>{t.message}</p>
                {t.reply && (
                  <div className="notice">คำตอบจากผู้ดูแล: {t.reply}</div>
                )}
              </article>
            ))}
          </div>
        </div>
      ) : (
        <div className="panel">
          <Link className="btn" href="/login?next=/support">
            เข้าสู่ระบบเพื่อแจ้งปัญหา
          </Link>
          <p>
            หรือติดต่อเราผ่านช่องทางในหน้า{" "}
            <Link href="/contact">ติดต่อเรา</Link>
          </p>
        </div>
      )}
    </section>
  );
}
