import { NextResponse } from "next/server";
import { makePdf } from "@/lib/pdf";
const cache = new Map<string, Promise<Buffer>>();
export async function GET(req: Request) {
  const grade =
    new URL(req.url).searchParams.get("grade") === "ม.4" ? "ม.4" : "ม.1";
  const pdf = await (cache.get(grade) ??
    cache
      .set(
        grade,
        makePdf("DEMO — ใบสมัครตัวอย่าง ข้อมูลสมมติเท่านั้น", [
          "โรงเรียนสาธิตเมตศึกษา (สมมติ)",
          "ปีการศึกษา 2570",
          "เลขที่ใบสมัคร DEMO-2570-0001",
          `ชั้น ${grade}`,
          "นักเรียนสมมติ เมตศึกษา",
          "ผู้ปกครองสมมติ เมตศึกษา",
          "ไม่บันทึกข้อมูลจริงและไม่เป็นใบสมัครที่ใช้ยื่นต่อโรงเรียน",
          "เอกสารนี้จัดทำเพื่อทดลองระบบ MET Admission โดย WORAMET AI LAB",
        ]),
      )
      .get(grade)!);
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="DEMO-application.pdf"',
      "Cache-Control": "public, max-age=3600",
    },
  });
}
