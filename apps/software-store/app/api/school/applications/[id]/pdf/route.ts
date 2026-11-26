import { NextResponse } from "next/server";
import { getViewer } from "@/lib/shop";
import { createClient } from "@/lib/supabase/server";
import { uuid } from "@/lib/security";
import { privateHeaders } from "@/lib/http";
import { makePdf } from "@/lib/pdf";
import { rateLimit } from "@/lib/rate-limit";
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { user } = await getViewer();
    if (!user)
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    await rateLimit("application-pdf", user.id, 10);
    const id = uuid.parse((await params).id);
    const { data: a } = await (await createClient())
      .from("school_applications")
      .select(
        "application_no,grade_level,student_name,guardian_name,guardian_phone,previous_school,created_at,school_sites(name,academic_year),school_rounds(name)",
      )
      .eq("id", id)
      .single()
      .overrideTypes<{
        school_sites: { name: string; academic_year: number } | null;
        school_rounds: { name: string } | null;
      }>();
    if (!a) return NextResponse.json({ error: "not found" }, { status: 404 });
    const pdf = await makePdf("ใบสมัครเรียน", [
      a.school_sites?.name ?? "",
      `ปีการศึกษา ${a.school_sites?.academic_year}`,
      `เลขที่ใบสมัคร ${a.application_no}`,
      `รอบ ${a.school_rounds?.name}`,
      `ชั้น ${a.grade_level}`,
      `ชื่อ-นามสกุลนักเรียน ${a.student_name}`,
      `ผู้ปกครอง ${a.guardian_name}`,
      `โทรศัพท์ ${a.guardian_phone}`,
      `โรงเรียนเดิม ${a.previous_school}`,
      `วันที่สมัคร ${new Date(a.created_at).toLocaleDateString("th-TH", { timeZone: "Asia/Bangkok" })}`,
      "เอกสารนี้ยืนยันการส่งใบสมัคร ไม่ใช่หลักฐานว่าผ่านการคัดเลือก",
    ]);
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        ...privateHeaders,
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${a.application_no}.pdf"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }
}
