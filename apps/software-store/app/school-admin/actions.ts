"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";
import { schoolStaff } from "@/lib/school";
import { requireUser } from "@/lib/shop";
import { createAdmin } from "@/lib/supabase/server";
import { uuid } from "@/lib/security";
import { rateLimit } from "@/lib/rate-limit";
import { cleanImage } from "@/lib/uploads";
import type { State } from "@/app/actions";
const t = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const fail = (): State => ({
  error: "บันทึกไม่สำเร็จ ตรวจข้อมูลและสิทธิ์ของโรงเรียน",
});
export async function saveSchool(_s: State, f: FormData): Promise<State> {
  try {
    const { user, site, db } = await schoolStaff(t(f, "slug"), ["owner"]);
    const v = z
      .object({
        name: z.string().min(3).max(150),
        description: z.string().max(5000),
        contact: z.string().max(1000),
        academic_year: z.coerce.number().int().min(2500).max(2700),
        color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
      })
      .parse(
        Object.fromEntries(
          ["name", "description", "contact", "academic_year", "color"].map(
            (k) => [k, t(f, k)],
          ),
        ),
      );
    const { error } = await db
      .from("school_sites")
      .update({ ...v, published: f.get("published") === "on" })
      .eq("id", site.id);
    if (error) return fail();
    await db.from("store_audit").insert({
      actor_id: user.id,
      action: "school.settings-updated",
      target_id: site.id,
    });
    revalidatePath(`/schools/${site.slug}`);
    revalidatePath(`/school-admin/${site.slug}`);
    return { success: "บันทึกการตั้งค่าแล้ว" };
  } catch {
    return fail();
  }
}
export async function uploadLogo(_s: State, f: FormData): Promise<State> {
  try {
    const { user, site, db } = await schoolStaff(t(f, "slug"), ["owner"]);
    const file = f.get("file");
    if (!(file instanceof File)) return fail();
    const image = await cleanImage(file, 2 * 1024 * 1024);
    const path = `${site.id}/${randomUUID()}.png`;
    const { error } = await db.storage
      .from("school-branding")
      .upload(path, image.data, { contentType: "image/png" });
    if (error) return fail();
    const { error: e } = await db
      .from("school_sites")
      .update({ logo_path: path })
      .eq("id", site.id);
    if (e) {
      await db.storage.from("school-branding").remove([path]);
      return fail();
    }
    if (site.logo_path)
      await db.storage.from("school-branding").remove([site.logo_path]);
    await db.from("store_audit").insert({
      actor_id: user.id,
      action: "school.logo-updated",
      target_id: site.id,
    });
    revalidatePath(`/schools/${site.slug}`);
    return { success: "อัปโหลดโลโก้แล้ว" };
  } catch {
    return { error: "ใช้ PNG/JPEG ไม่เกิน 2 MB" };
  }
}
export async function savePost(_s: State, f: FormData): Promise<State> {
  try {
    const { user, site, db } = await schoolStaff(t(f, "slug"), [
      "owner",
      "editor",
    ]);
    const title = z.string().min(3).max(200).parse(t(f, "title"));
    const body = z.string().min(10).max(20000).parse(t(f, "body"));
    const v = {
      title,
      body,
      school_id: site.id,
      published: f.get("published") === "on",
    };
    const id = t(f, "id");
    const r = id
      ? await db
          .from("school_posts")
          .update(v)
          .eq("id", uuid.parse(id))
          .eq("school_id", site.id)
          .select("id")
          .single()
      : await db.from("school_posts").insert(v).select("id").single();
    if (r.error || !r.data) return fail();
    await db.from("store_audit").insert({
      actor_id: user.id,
      action: "school.post-saved",
      target_id: r.data.id,
    });
    revalidatePath(`/schools/${site.slug}`);
    revalidatePath(`/school-admin/${site.slug}`);
    return { success: "บันทึกข่าวแล้ว" };
  } catch {
    return fail();
  }
}
export async function saveRound(_s: State, f: FormData): Promise<State> {
  try {
    const { user, site, db } = await schoolStaff(t(f, "slug"), ["owner"]);
    const v = z
      .object({
        name: z.string().min(3).max(150),
        grade_levels: z.array(z.string().min(1).max(30)).min(1).max(20),
        opens_at: z.iso.datetime(),
        closes_at: z.iso.datetime(),
      })
      .parse({
        name: t(f, "name"),
        grade_levels: t(f, "grades")
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean),
        opens_at: new Date(t(f, "opens_at") + "+07:00").toISOString(),
        closes_at: new Date(t(f, "closes_at") + "+07:00").toISOString(),
      });
    if (v.closes_at <= v.opens_at)
      return { error: "วันปิดต้องอยู่หลังวันเปิด" };
    const id = t(f, "id");
    const value = {
      ...v,
      school_id: site.id,
      is_open: f.get("is_open") === "on",
      results_published: f.get("results_published") === "on",
    };
    const r = id
      ? await db
          .from("school_rounds")
          .update(value)
          .eq("id", uuid.parse(id))
          .eq("school_id", site.id)
          .select("id")
          .single()
      : await db.from("school_rounds").insert(value).select("id").single();
    if (r.error) return fail();
    await db.from("store_audit").insert({
      actor_id: user.id,
      action: "admission.round-saved",
      target_id: r.data?.id,
    });
    revalidatePath(`/school-admin/${site.slug}`);
    revalidatePath(`/schools/${site.slug}`);
    return { success: "บันทึกรอบรับสมัครแล้ว" };
  } catch {
    return fail();
  }
}
export async function reviewApplication(
  _s: State,
  f: FormData,
): Promise<State> {
  try {
    const { user, site, db } = await schoolStaff(t(f, "slug"), [
      "owner",
      "officer",
    ]);
    const { error } = await db.rpc("school_review_application", {
      p_actor: user.id,
      p_school: site.id,
      p_application: uuid.parse(t(f, "id")),
      p_status: z
        .enum(["needs_documents", "approved", "rejected"])
        .parse(t(f, "status")),
      p_note: z.string().min(3).max(2000).parse(t(f, "note")),
    });
    if (error) return fail();
    revalidatePath(`/school-admin/${site.slug}`);
    revalidatePath(`/schools/${site.slug}/applications`);
    return { success: "บันทึกผลตรวจแล้ว" };
  } catch {
    return fail();
  }
}
export async function setSchoolMember(_s: State, f: FormData): Promise<State> {
  try {
    const { user, site, db } = await schoolStaff(t(f, "slug"), ["owner"]);
    const target = uuid.parse(t(f, "user_id"));
    if (target === user.id)
      return { error: "ไม่สามารถเปลี่ยนสิทธิ์ตนเองผ่านหน้านี้" };
    const role = z.enum(["officer", "editor", "executive"]).parse(t(f, "role"));
    const { data: existing } = await db
      .from("school_members")
      .select("role")
      .eq("school_id", site.id)
      .eq("user_id", target)
      .maybeSingle();
    if (existing?.role === "owner")
      return { error: "ไม่สามารถเปลี่ยนสิทธิ์เจ้าของคนอื่น" };
    const r =
      f.get("revoke") === "on"
        ? await db
            .from("school_members")
            .delete()
            .eq("school_id", site.id)
            .eq("user_id", target)
        : await db
            .from("school_members")
            .upsert({ school_id: site.id, user_id: target, role });
    if (r.error) return fail();
    await db.from("store_audit").insert({
      actor_id: user.id,
      action: "school.member-changed",
      target_id: target,
      details: { school_id: site.id, role, revoke: f.get("revoke") === "on" },
    });
    revalidatePath(`/school-admin/${site.slug}`);
    return { success: "ปรับสิทธิ์เจ้าหน้าที่แล้ว" };
  } catch {
    return fail();
  }
}
export async function submitApplication(
  _s: State,
  f: FormData,
): Promise<State> {
  try {
    const user = await requireUser();
    await rateLimit("application", user.id, 5, 3600);
    if (f.get("consent") !== "on")
      return { error: "กรุณาอ่านและยอมรับการประมวลผลข้อมูลเพื่อรับสมัคร" };
    const db = createAdmin();
    const { data: site } = await db
      .from("school_sites")
      .select("id,slug,published")
      .eq("slug", t(f, "slug"))
      .eq("published", true)
      .single();
    if (!site) return fail();
    const v = z
      .object({
        p_user: uuid,
        p_school: uuid,
        p_round: uuid,
        p_grade: z.string().min(1).max(30),
        p_student: z.string().min(3).max(150),
        p_guardian: z.string().min(3).max(150),
        p_phone: z.string().regex(/^0[0-9]{8,9}$/),
        p_previous: z.string().max(200),
      })
      .parse({
        p_user: user.id,
        p_school: site.id,
        p_round: t(f, "round_id"),
        p_grade: t(f, "grade_level"),
        p_student: t(f, "student_name"),
        p_guardian: t(f, "guardian_name"),
        p_phone: t(f, "guardian_phone"),
        p_previous: t(f, "previous_school"),
      });
    const { data, error } = await db.rpc("school_submit_application", v);
    if (error)
      return { error: "สมัครไม่สำเร็จ รอบรับสมัครอาจปิด หรือมีใบสมัครนี้แล้ว" };
    revalidatePath(`/schools/${site.slug}/applications`);
    return {
      success:
        "บันทึกใบสมัครแล้ว เปิดหน้าตรวจสอบสถานะเพื่อดูเลขที่ใบสมัครและแนบเอกสาร",
      id: data,
    };
  } catch {
    return fail();
  }
}
export async function uploadDocument(_s: State, f: FormData): Promise<State> {
  try {
    const user = await requireUser();
    await rateLimit("documents", user.id, 10, 3600);
    const db = createAdmin();
    const id = uuid.parse(t(f, "application_id"));
    const kind = z
      .enum(["identity", "transcript", "photo"])
      .parse(t(f, "kind"));
    const { data: application } = await db
      .from("school_applications")
      .select("id,school_id,status")
      .eq("id", id)
      .eq("applicant_id", user.id)
      .single();
    if (
      !application ||
      !["submitted", "needs_documents"].includes(application.status)
    )
      return fail();
    const file = f.get("file");
    if (!(file instanceof File)) return fail();
    const image = await cleanImage(file);
    const path = `${application.school_id}/${id}/${randomUUID()}.png`;
    const { error } = await db.storage
      .from("school-documents")
      .upload(path, image.data, { contentType: "image/png", upsert: false });
    if (error) return fail();
    const { data: oldpath, error: recordError } = await db.rpc(
      "school_register_document",
      {
        p_user: user.id,
        p_application: id,
        p_kind: kind,
        p_path: path,
        p_hash: image.canonicalHash,
      },
    );
    if (recordError) {
      await db.storage.from("school-documents").remove([path]);
      return fail();
    }
    if (oldpath) await db.storage.from("school-documents").remove([oldpath]);
    revalidatePath("/schools", "layout");
    return { success: "อัปโหลดเอกสารแล้ว" };
  } catch {
    return { error: "อัปโหลดไม่สำเร็จ ใช้ PNG/JPEG ไม่เกิน 5 MB" };
  }
}
