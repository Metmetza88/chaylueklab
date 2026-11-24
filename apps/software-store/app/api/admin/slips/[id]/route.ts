import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/shop";
import { uuid } from "@/lib/security";
import { privateHeaders } from "@/lib/http";
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { db } = await requireAdmin();
    const id = uuid.parse((await params).id);
    const { data: s } = await db
      .from("store_slips")
      .select("storage_path")
      .eq("order_id", id)
      .single();
    if (!s) return NextResponse.json({ error: "not found" }, { status: 404 });
    const { data, error } = await db.storage
      .from("store-slips")
      .createSignedUrl(s.storage_path, 60);
    if (error || !data)
      return NextResponse.json({ error: "not found" }, { status: 404 });
    return new NextResponse(null, {
      status: 302,
      headers: { ...privateHeaders, Location: data.signedUrl },
    });
  } catch {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
}
