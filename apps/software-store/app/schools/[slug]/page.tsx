import Image from "next/image";
import { notFound } from "next/navigation";
import Link from "next/link";
import { schoolPublic } from "@/lib/school";
import { createClient } from "@/lib/supabase/server";
import { configured } from "@/lib/env";
export default async function School({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  if (!configured()) notFound();
  const { slug } = await params;
  const site = await schoolPublic(slug);
  if (!site) notFound();
  const db = await createClient();
  const [{ data: posts }, { data: rounds }] = await Promise.all([
    db
      .from("school_posts")
      .select("*")
      .eq("school_id", site.id)
      .eq("published", true)
      .order("created_at", { ascending: false }),
    db
      .from("school_rounds")
      .select("*")
      .eq("school_id", site.id)
      .order("opens_at", { ascending: false }),
  ]);
  return (
    <section className="section">
      <div className="school-hero" style={{ borderColor: site.color }}>
        {site.logo_path ? (
          <Image
            unoptimized
            src={`/api/school/${slug}/logo`}
            width={65}
            height={65}
            alt={`โลโก้ ${site.name}`}
          />
        ) : (
          <div className="school-card-logo">M</div>
        )}
        <span className="eyebrow">
          MET SCHOOL PRO / ปีการศึกษา {site.academic_year}
        </span>
        <h1>{site.name}</h1>
        <p style={{ whiteSpace: "pre-wrap" }}>{site.description}</p>
        <div className="row">
          <Link className="btn" href={`/schools/${slug}/apply`}>
            สมัครเรียนออนไลน์ →
          </Link>
          <Link className="btn ghost" href={`/schools/${slug}/applications`}>
            ตรวจสอบสถานะ / ผลการสมัคร
          </Link>
          <Link className="btn ghost" href={`/school-admin/${slug}`}>
            สำหรับเจ้าหน้าที่
          </Link>
        </div>
      </div>
      <div className="info-grid">
        <section>
          <h2>ข่าวสารและประกาศ</h2>
          {posts?.map((p) => (
            <article className="panel" style={{ marginTop: 20 }} key={p.id}>
              <span className="muted">
                {new Date(p.created_at).toLocaleDateString("th-TH")}
              </span>
              <h3>{p.title}</h3>
              <p style={{ whiteSpace: "pre-wrap" }}>{p.body}</p>
            </article>
          ))}
          {!posts?.length && <p className="muted">ยังไม่มีข่าวที่เผยแพร่</p>}
        </section>
        <section>
          <h2>รอบรับสมัคร</h2>
          {rounds?.map((r) => (
            <article
              className="panel stack"
              style={{ marginTop: 20 }}
              key={r.id}
            >
              <h3>{r.name}</h3>
              <span className="status">
                {r.is_open &&
                new Date(r.opens_at) <= new Date() &&
                new Date(r.closes_at) > new Date()
                  ? "เปิดรับสมัคร"
                  : "ปิดรับสมัคร"}
              </span>
              <p className="muted">
                {r.grade_levels.join(", ")}
                <br />
                {new Date(r.opens_at).toLocaleDateString("th-TH")} ถึง{" "}
                {new Date(r.closes_at).toLocaleDateString("th-TH")}
              </p>
              {r.results_published && (
                <Link href={`/schools/${slug}/applications`}>
                  ประกาศผลแล้ว ตรวจสอบผลส่วนตัว →
                </Link>
              )}
            </article>
          ))}
        </section>
      </div>
      <div className="panel" style={{ marginTop: 25 }}>
        <h2>ติดต่อโรงเรียน</h2>
        <p style={{ whiteSpace: "pre-wrap" }}>
          {site.contact || "ยังไม่ได้ระบุช่องทางติดต่อ"}
        </p>
      </div>
    </section>
  );
}
