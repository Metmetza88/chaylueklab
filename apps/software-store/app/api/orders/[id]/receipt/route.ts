import { NextResponse } from "next/server";
import { getViewer, baht } from "@/lib/shop";
import { createClient } from "@/lib/supabase/server";
import { uuid } from "@/lib/security";
import { makePdf } from "@/lib/pdf";
import { privateHeaders } from "@/lib/http";
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { user } = await getViewer();
    if (!user)
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    const id = uuid.safeParse((await params).id);
    if (!id.success)
      return NextResponse.json({ error: "invalid id" }, { status: 400 });
    const { data: o } = await (await createClient())
      .from("store_orders")
      .select("*,store_order_items(*)")
      .eq("id", id.data)
      .eq("user_id", user.id)
      .single();
    if (!o) return NextResponse.json({ error: "not found" }, { status: 404 });
    const pdf = await makePdf("ใบยืนยันคำสั่งซื้อ", [
      o.mode === "sandbox"
        ? "SANDBOX — ไม่ใช่ใบเสร็จรับเงินจริง"
        : "เอกสารยืนยันคำสั่งซื้อ ไม่ใช่ใบกำกับภาษี",
      `เลขคำสั่งซื้อ ${o.order_no}`,
      `วันที่ ${new Date(o.created_at).toLocaleDateString("th-TH", { timeZone: "Asia/Bangkok" })}`,
      `สถานะ ${o.status}`,
      ...o.store_order_items.map(
        (i: any) => `${i.product_name}   ${baht(i.unit_price_cents)}`,
      ),
      `ส่วนลด ${baht(o.discount_cents)}`,
      `ยอดรวม ${baht(o.total_cents)}`,
    ]);
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        ...privateHeaders,
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="order-${o.order_no}.pdf"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }
}
