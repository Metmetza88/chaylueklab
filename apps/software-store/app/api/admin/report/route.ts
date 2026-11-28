import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/shop";
import { csvCell } from "@/lib/security";
import { privateHeaders } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
export async function GET() {
  try {
    const { user, db } = await requireAdmin();
    await rateLimit("sales-report", user.id, 5, 3600);
    const rows: any[] = [];
    for (let offset = 0; offset < 10000; offset += 1000) {
      const { data, error } = await db
        .from("store_orders")
        .select(
          "order_no,mode,status,total_cents,discount_cents,created_at,paid_at",
        )
        .order("created_at")
        .order("id")
        .range(offset, offset + 999);
      if (error) throw error;
      rows.push(...data);
      if (data.length < 1000) break;
    }
    await db.from("store_audit").insert({
      actor_id: user.id,
      action: "sales.exported",
      details: { rows: rows.length, limit: 10000 },
    });
    const keys = [
      "order_no",
      "mode",
      "status",
      "total_cents",
      "discount_cents",
      "created_at",
      "paid_at",
    ];
    return new NextResponse(
      "\uFEFF" +
        [keys, ...rows.map((r) => keys.map((k) => r[k]))]
          .map((r) => r.map(csvCell).join(","))
          .join("\r\n"),
      {
        headers: {
          ...privateHeaders,
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": 'attachment; filename="sales-report.csv"',
        },
      },
    );
  } catch {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
}
