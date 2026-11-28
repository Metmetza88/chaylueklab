import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getViewer } from "@/lib/shop";
import { schoolPublic } from "@/lib/school";
import { createClient } from "@/lib/supabase/server";
import { configured } from "@/lib/env";
import ActionForm from "@/components/ActionForm";
import { submitApplication } from "@/app/school-admin/actions";
export default async function Apply({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!configured()) notFound();
  const { user } = await getViewer();
  if (!user) redirect(`/login?next=/schools/${slug}/apply`);
  const site = await schoolPublic(slug);
  if (!site) notFound();
  const { data: rounds } = await (await createClient())
    .from("school_rounds")
    .select("*")
    .eq("school_id", site.id)
    .eq("is_open", true)
    .lte("opens_at", new Date().toISOString())
    .gt("closes_at", new Date().toISOString());
  const grades = [
    ...new Set(rounds?.flatMap((r) => r.grade_levels as string[]) ?? []),
  ];
  return (
    <section className="prose">
      <span className="eyebrow">MET ADMISSION</span>
      <h1>สมัครเรียนออนไลน์</h1>
      <p>
        {site.name} · ปีการศึกษา {site.academic_year}
      </p>
      {!rounds?.length ? (
        <p className="notice">ขณะนี้ยังไม่มีรอบที่เปิดรับสมัคร</p>
      ) : (
        <div className="panel">
          <ActionForm action={submitApplication} label="ยืนยันส่งใบสมัคร">
            <input name="slug" type="hidden" value={slug} />
            <label>
              รอบรับสมัคร
              <select name="round_id" required>
                {rounds.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.grade_levels.join(", ")})
                  </option>
                ))}
              </select>
            </label>
            <label>
              ระดับชั้นที่สมัคร
              <select name="grade_level" required>
                {grades.map((g) => (
                  <option key={g}>{g}</option>
                ))}
              </select>
            </label>
            <label>
              ชื่อและนามสกุลนักเรียน
              <input
                name="student_name"
                required
                minLength={3}
                maxLength={150}
                autoComplete="off"
              />
            </label>
            <label>
              ชื่อและนามสกุลผู้ปกครอง
              <input
                name="guardian_name"
                required
                minLength={3}
                maxLength={150}
                autoComplete="name"
              />
            </label>
            <label>
              โทรศัพท์ผู้ปกครอง
              <input
                name="guardian_phone"
                type="tel"
                required
                pattern="0[0-9]{8,9}"
                autoComplete="tel"
              />
            </label>
            <label>
              โรงเรียนเดิม
              <input name="previous_school" maxLength={200} />
            </label>
            <label className="check">
              <input name="consent" type="checkbox" required />
              ข้าพเจ้าเป็นผู้ปกครอง/ผู้มีอำนาจให้ข้อมูล
              ได้อ่านนโยบายข้อมูลและยินยอมให้โรงเรียนใช้ข้อมูลและเอกสารเพื่อดำเนินการรับสมัคร
            </label>
            <p className="muted">
              <Link href="/privacy">อ่านนโยบายความเป็นส่วนตัว</Link> ·
              โรงเรียนต้องแจ้งรายละเอียดและฐานการประมวลผลของตนก่อนเปิดรับข้อมูลจริง
            </p>
          </ActionForm>
        </div>
      )}
      <Link className="btn ghost" href={`/schools/${slug}/applications`}>
        ตรวจสอบใบสมัครและอัปโหลดเอกสาร →
      </Link>
    </section>
  );
}
