import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getViewer } from "@/lib/shop";
import { schoolStaff } from "@/lib/school";
import ActionForm from "@/components/ActionForm";
import { z } from "zod";
import { uuid } from "@/lib/security";
import {
  saveSchool,
  uploadLogo,
  savePost,
  saveRound,
  reviewApplication,
  setSchoolMember,
} from "../actions";

const pageSize = 100;
const applicationCursor = z.tuple([z.iso.datetime({ offset: true }), uuid]);

export default async function Admin({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    queue?: string | string[];
    before?: string | string[];
  }>;
}) {
  const { slug } = await params;
  const { queue, before } = await searchParams;
  const v = await getViewer();
  if (!v.user) redirect(`/login?next=/school-admin/${slug}`);
  let ctx;
  try {
    ctx = await schoolStaff(slug);
  } catch {
    notFound();
  }
  const { site, role, db } = ctx;
  const canReview = ["owner", "officer"].includes(role);
  const canRead = canReview || role === "executive";
  const pendingOnly = queue === "pending";
  const cursor = applicationCursor.safeParse(
    typeof before === "string" ? before.split("|") : null,
  );
  const applicationQuery = db
    .from("school_applications")
    .select("*,school_documents(id,kind)")
    .eq("school_id", site.id)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(pageSize + 1);
  if (pendingOnly)
    applicationQuery.in("status", ["submitted", "needs_documents"]);
  if (cursor.success) {
    const [createdAt, id] = cursor.data;
    applicationQuery.or(
      `created_at.lt.${createdAt},and(created_at.eq.${createdAt},id.lt.${id})`,
    );
  }
  const [
    { data: apps, error: appError },
    { data: posts },
    { data: rounds },
    { data: stats },
  ] = await Promise.all([
    canRead ? applicationQuery : Promise.resolve({ data: [], error: null }),
    ["owner", "editor"].includes(role)
      ? db
          .from("school_posts")
          .select("*")
          .eq("school_id", site.id)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),
    db
      .from("school_rounds")
      .select("*")
      .eq("school_id", site.id)
      .order("opens_at", { ascending: false }),
    canRead
      ? db.rpc("school_dashboard", { p_actor: v.user.id, p_school: site.id })
      : Promise.resolve({ data: null }),
  ]);
  const visibleApps = apps?.slice(0, pageSize) ?? [];
  const last = visibleApps.at(-1);
  const queuePath = `/school-admin/${slug}`;
  const nextParams = new URLSearchParams(
    pendingOnly ? { queue: "pending" } : {},
  );
  if (last && apps && apps.length > pageSize) {
    nextParams.set("before", `${last.created_at}|${last.id}`);
  }
  return (
    <section className="section">
      <span className="eyebrow">MET SCHOOL PRO + MET ADMISSION</span>
      <h1>{site.name}</h1>
      <p className="muted">
        บทบาท {role} · ปีการศึกษา {site.academic_year}
      </p>
      <div className="row">
        <Link className="btn ghost" href={`/schools/${slug}`}>
          เปิดเว็บไซต์โรงเรียน ↗
        </Link>
        {canRead && (
          <a className="btn ghost" href={`/api/school/${slug}/export`}>
            ส่งออก CSV สำหรับ Excel
          </a>
        )}
      </div>
      {stats && (
        <div className="stats-grid" style={{ marginTop: 25 }}>
          {[
            ["ใบสมัครทั้งหมด", stats.total],
            ["รอตรวจ", stats.submitted],
            ["ผ่าน", stats.approved],
            ["ไม่ผ่าน", stats.rejected],
          ].map(([l, n]) => (
            <div className="stat-card" key={l}>
              <span>{l}</span>
              <strong>{n}</strong>
            </div>
          ))}
        </div>
      )}
      {appError && <p className="error">โหลดใบสมัครไม่สำเร็จ</p>}
      {canRead && (
        <section className="admin-section" id="applications">
          <h2>ใบสมัคร</h2>
          <nav className="row" aria-label="ตัวกรองใบสมัคร">
            <Link
              className="btn ghost"
              aria-current={!pendingOnly ? "page" : undefined}
              href={`${queuePath}#applications`}
            >
              ทั้งหมด
            </Link>
            <Link
              className="btn ghost"
              aria-current={pendingOnly ? "page" : undefined}
              href={`${queuePath}?queue=pending#applications`}
            >
              รอเจ้าหน้าที่หรือเอกสาร
            </Link>
          </nav>
          {!appError && !visibleApps.length && <p>ไม่มีใบสมัครในหน้านี้</p>}
          {visibleApps.map((a) => (
            <article className="panel stack" key={a.id}>
              <div className="row spaced">
                <strong>{a.application_no}</strong>
                <span className="status">{a.status}</span>
              </div>
              <p>
                {a.student_name} · {a.grade_level}
                <br />
                ผู้ปกครอง {a.guardian_name} · {a.guardian_phone}
              </p>
              {canReview && (
                <>
                  <div className="row">
                    {a.school_documents?.map((d: any) => (
                      <a
                        className="btn ghost"
                        key={d.id}
                        href={`/api/school/documents/${d.id}`}
                        target="_blank"
                        rel="noopener"
                      >
                        ตรวจเอกสาร {d.kind} ↗
                      </a>
                    ))}
                  </div>
                  <ActionForm action={reviewApplication} label="บันทึกผลตรวจ">
                    <input name="slug" type="hidden" value={slug} />
                    <input name="id" type="hidden" value={a.id} />
                    <label>
                      ผลตรวจ
                      <select
                        name="status"
                        defaultValue={
                          a.status === "submitted"
                            ? "needs_documents"
                            : a.status
                        }
                      >
                        <option value="needs_documents">ขอเอกสารเพิ่ม</option>
                        <option value="approved">อนุมัติ</option>
                        <option value="rejected">ปฏิเสธ</option>
                      </select>
                    </label>
                    <label>
                      หมายเหตุ (ผลคัดเลือกและหมายเหตุจะแสดงเมื่อประกาศผล)
                      <textarea
                        name="note"
                        required
                        minLength={3}
                        maxLength={2000}
                        defaultValue={a.review_note ?? ""}
                      />
                    </label>
                  </ActionForm>
                </>
              )}
            </article>
          ))}
          {(cursor.success || nextParams.has("before")) && (
            <nav className="row" aria-label="หน้าใบสมัคร">
              {cursor.success && (
                <Link
                  className="btn ghost"
                  href={`${queuePath}${pendingOnly ? "?queue=pending" : ""}#applications`}
                >
                  กลับหน้าแรกของคิว
                </Link>
              )}
              {nextParams.has("before") && (
                <Link
                  className="btn ghost"
                  href={`${queuePath}?${nextParams}#applications`}
                >
                  ดูใบสมัครก่อนหน้า
                </Link>
              )}
            </nav>
          )}
        </section>
      )}
      {["owner", "editor"].includes(role) && (
        <section className="admin-section">
          <h2>ข่าวสารและประกาศ</h2>
          <details className="panel">
            <summary>เพิ่มข่าวใหม่</summary>
            <PostForm slug={slug} />
          </details>
          {posts?.map((p) => (
            <details className="panel" key={p.id}>
              <summary>
                {p.title} · {p.published ? "เผยแพร่" : "ฉบับร่าง"}
              </summary>
              <PostForm slug={slug} p={p} />
            </details>
          ))}
        </section>
      )}
      {role === "owner" && (
        <>
          <section className="admin-section">
            <h2>รอบรับสมัครและประกาศผล</h2>
            <details className="panel">
              <summary>เพิ่มรอบรับสมัคร</summary>
              <RoundForm slug={slug} />
            </details>
            {rounds?.map((r) => (
              <details className="panel" key={r.id}>
                <summary>
                  {r.name} · {r.is_open ? "เปิด" : "ปิด"}
                </summary>
                <RoundForm slug={slug} r={r} />
              </details>
            ))}
          </section>
          <section className="admin-section">
            <h2>ตั้งค่าเว็บไซต์โรงเรียน</h2>
            <div className="panel">
              <ActionForm action={saveSchool}>
                <input name="slug" type="hidden" value={slug} />
                <div className="form-grid">
                  <label>
                    ชื่อโรงเรียน
                    <input
                      name="name"
                      defaultValue={site.name}
                      minLength={3}
                      maxLength={150}
                      required
                    />
                  </label>
                  <label>
                    ปีการศึกษา พ.ศ.
                    <input
                      name="academic_year"
                      type="number"
                      min={2500}
                      max={2700}
                      defaultValue={site.academic_year}
                      required
                    />
                  </label>
                  <label>
                    สีโรงเรียน
                    <input
                      name="color"
                      type="color"
                      defaultValue={site.color}
                    />
                  </label>
                  <label className="check">
                    <input
                      name="published"
                      type="checkbox"
                      defaultChecked={site.published}
                    />
                    เผยแพร่เว็บไซต์
                  </label>
                  <label className="span-full">
                    แนะนำโรงเรียน
                    <textarea
                      name="description"
                      defaultValue={site.description}
                      maxLength={5000}
                    />
                  </label>
                  <label className="span-full">
                    ช่องทางติดต่อ
                    <textarea
                      name="contact"
                      defaultValue={site.contact}
                      maxLength={1000}
                    />
                  </label>
                </div>
              </ActionForm>
            </div>
            <div className="panel">
              <ActionForm action={uploadLogo} label="อัปโหลดโลโก้">
                <input name="slug" type="hidden" value={slug} />
                <label>
                  โลโก้ PNG/JPEG ไม่เกิน 2 MB
                  <input
                    name="file"
                    type="file"
                    accept="image/png,image/jpeg"
                    required
                  />
                </label>
              </ActionForm>
            </div>
          </section>
          <section className="admin-section">
            <h2>สิทธิ์เจ้าหน้าที่</h2>
            <div className="panel">
              <ActionForm action={setSchoolMember}>
                <input name="slug" type="hidden" value={slug} />
                <label>
                  UUID บัญชีเจ้าหน้าที่
                  <input name="user_id" required />
                </label>
                <label>
                  บทบาท
                  <select name="role">
                    <option value="officer">
                      เจ้าหน้าที่รับสมัคร (ตรวจใบสมัคร/เอกสาร)
                    </option>
                    <option value="editor">
                      ผู้แก้ไขข่าว (ไม่เห็นใบสมัคร)
                    </option>
                    <option value="executive">
                      ผู้บริหาร (อ่านใบสมัคร/รายงาน)
                    </option>
                  </select>
                </label>
                <label className="check">
                  <input name="revoke" type="checkbox" />
                  ถอนสิทธิ์เจ้าหน้าที่คนนี้
                </label>
              </ActionForm>
            </div>
          </section>
        </>
      )}
    </section>
  );
}
function PostForm({ slug, p }: { slug: string; p?: any }) {
  return (
    <ActionForm action={savePost}>
      <input name="slug" type="hidden" value={slug} />
      <input name="id" type="hidden" value={p?.id ?? ""} />
      <label>
        หัวข้อ
        <input
          name="title"
          defaultValue={p?.title ?? ""}
          required
          minLength={3}
          maxLength={200}
        />
      </label>
      <label>
        เนื้อหา
        <textarea
          name="body"
          defaultValue={p?.body ?? ""}
          required
          minLength={10}
          maxLength={20000}
        />
      </label>
      <label className="check">
        <input name="published" type="checkbox" defaultChecked={p?.published} />
        เผยแพร่
      </label>
    </ActionForm>
  );
}
function RoundForm({ slug, r }: { slug: string; r?: any }) {
  const dt = (s?: string) =>
    s
      ? new Date(new Date(s).getTime() + 7 * 3600000).toISOString().slice(0, 16)
      : "";
  return (
    <ActionForm action={saveRound}>
      <input name="slug" type="hidden" value={slug} />
      <input name="id" type="hidden" value={r?.id ?? ""} />
      <label>
        ชื่อรอบ
        <input
          name="name"
          defaultValue={r?.name ?? ""}
          required
          minLength={3}
        />
      </label>
      <label>
        ระดับชั้น คั่นด้วยเครื่องหมายจุลภาค
        <input
          name="grades"
          defaultValue={r?.grade_levels.join(", ") ?? "ม.1, ม.4"}
          required
        />
      </label>
      <label>
        เปิดรับ (เวลาประเทศไทย UTC+7)
        <input
          name="opens_at"
          type="datetime-local"
          defaultValue={dt(r?.opens_at)}
          required
        />
      </label>
      <label>
        ปิดรับ (เวลาประเทศไทย UTC+7)
        <input
          name="closes_at"
          type="datetime-local"
          defaultValue={dt(r?.closes_at)}
          required
        />
      </label>
      <label className="check">
        <input name="is_open" type="checkbox" defaultChecked={r?.is_open} />
        เปิดรับสมัคร (ต้องอยู่ในช่วงวันเวลา)
      </label>
      <label className="check">
        <input
          name="results_published"
          type="checkbox"
          defaultChecked={r?.results_published}
        />
        ประกาศผลให้ผู้ปกครองตรวจผลของตนเอง
      </label>
    </ActionForm>
  );
}
