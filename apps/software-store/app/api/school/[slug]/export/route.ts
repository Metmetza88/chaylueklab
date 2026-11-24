import { NextResponse } from "next/server";
import { schoolStaff } from "@/lib/school";
import { csvCell } from "@/lib/security";
import { privateHeaders } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { user, db, site } = await schoolStaff((await params).slug, [
      "owner",
      "officer",
      "executive",
    ]);
    await rateLimit("school-export", user.id, 5, 3600);
    const rows: any[] = [];
    for (let offset = 0; offset < 10000; offset += 1000) {
      const { data, error } = await db
        .from("school_applications")
        .select(
          "application_no,grade_level,student_name,guardian_name,guardian_phone,status,created_at",
        )
        .eq("school_id", site.id)
        .order("created_at")
        .order("id")
        .range(offset, offset + 999);
      if (error) throw error;
      rows.push(...data);
      if (data.length < 1000) break;
    }
    const { error } = await db.from("store_audit").insert({
      actor_id: user.id,
      action: "application.exported",
      target_id: site.id,
      details: { rows: rows.length, limit: 10000 },
    });
    if (error) throw error;
    const columns = [
      "application_no",
      "grade_level",
      "student_name",
      "guardian_name",
      "guardian_phone",
      "status",
      "created_at",
    ];
    const csv =
      "\uFEFF" +
      [columns, ...rows.map((r) => columns.map((k) => r[k]))]
        .map((r) => r.map(csvCell).join(","))
        .join("\r\n");
    return new NextResponse(csv, {
      headers: {
        ...privateHeaders,
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${site.slug}-applications.csv"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
}
