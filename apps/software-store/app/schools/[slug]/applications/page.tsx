import { notFound, redirect } from "next/navigation";
import { getViewer } from "@/lib/shop";
import { schoolPublic } from "@/lib/school";
import { createAdmin } from "@/lib/supabase/server";
import { configured } from "@/lib/env";
import ActionForm from "@/components/ActionForm";
import { uploadDocument } from "@/app/school-admin/actions";
const labels = {
  submitted: "ส่งใบสมัครแล้ว",
  needs_documents: "ต้องแก้ไข/ส่งเอกสารเพิ่ม",
  approved: "ผ่านการคัดเลือก",
  rejected: "ไม่ผ่านการคัดเลือก",
  awaiting_publication: "ตรวจแล้ว รอประกาศผล",
};
type ApplicantApplication = {
  id: string;
  application_no: string;
  student_name: string;
  grade_level: string;
  round_name: string;
  status: keyof typeof labels;
  review_note: string | null;
  school_documents: { id: string; kind: string }[];
};
export default async function Applications({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!configured()) notFound();
  const { user } = await getViewer();
  if (!user) redirect(`/login?next=/schools/${slug}/applications`);
  const site = await schoolPublic(slug);
  if (!site) notFound();
  const { data: rows, error } = await createAdmin().rpc(
    "school_list_applicant_applications",
    { p_school: site.id, p_applicant: user.id },
  );
  const applications: ApplicantApplication[] = rows ?? [];
  return (
    <section className="section">
      <h1>ใบสมัครและสถานะของฉัน</h1>
      <p className="muted">
        {site.name} · ไม่มีการแสดงรายชื่อนักเรียนสู่สาธารณะ
      </p>
      {error && <p className="error">โหลดใบสมัครไม่สำเร็จ</p>}
      {!error && !applications.length && <p className="panel">ยังไม่มีใบสมัคร</p>}
      {applications.map((a) => (
        <article className="panel stack" style={{ marginTop: 20 }} key={a.id}>
          <div className="row spaced">
            <h2>{a.application_no}</h2>
            <span className="status">{labels[a.status]}</span>
          </div>
          <p>
            {a.student_name} · {a.grade_level} · {a.round_name}
          </p>
          {a.review_note && (
            <p className="notice">หมายเหตุจากเจ้าหน้าที่: {a.review_note}</p>
          )}
          <a
            className="btn ghost"
            href={`/api/school/applications/${a.id}/pdf`}
          >
            ดาวน์โหลดใบสมัคร PDF
          </a>
          <div className="row">
            {a.school_documents.map((d) => (
              <a
                key={d.id}
                href={`/api/school/documents/${d.id}`}
                target="_blank"
                rel="noopener"
              >
                ดูเอกสาร {d.kind} ↗
              </a>
            ))}
          </div>
          {["submitted", "needs_documents"].includes(a.status) && (
            <ActionForm action={uploadDocument} label="อัปโหลดเอกสาร">
              <input name="application_id" type="hidden" value={a.id} />
              <div className="form-grid">
                <label>
                  ชนิดเอกสาร
                  <select name="kind">
                    <option value="identity">หลักฐานตัวตน</option>
                    <option value="transcript">ผลการเรียน</option>
                    <option value="photo">รูปถ่าย</option>
                  </select>
                </label>
                <label>
                  ภาพ PNG/JPEG ไม่เกิน 5 MB
                  <input
                    name="file"
                    type="file"
                    accept="image/png,image/jpeg"
                    required
                  />
                </label>
              </div>
            </ActionForm>
          )}
        </article>
      ))}
    </section>
  );
}
