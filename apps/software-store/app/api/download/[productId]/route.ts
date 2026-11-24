import { NextResponse, type NextRequest } from "next/server";
import { createAdmin } from "@/lib/supabase/server";
import { getViewer } from "@/lib/shop";
import { uuid } from "@/lib/security";
import { rateLimit } from "@/lib/rate-limit";
import { privateHeaders } from "@/lib/http";
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ productId: string }> },
) {
  try {
    const { user, isAdmin, isVip } = await getViewer();
    if (!user)
      return NextResponse.json(
        { error: "กรุณาเข้าสู่ระบบ" },
        { status: 401, headers: privateHeaders },
      );
    const parsed = uuid.safeParse((await params).productId);
    if (!parsed.success)
      return NextResponse.json(
        { error: "รหัสสินค้าไม่ถูกต้อง" },
        { status: 400 },
      );
    await rateLimit("download", user.id, 15, 60);
    const db = createAdmin();
    const { data: p } = await db
      .from("store_products")
      .select("id,status,vip_free,latest_release_id")
      .eq("id", parsed.data)
      .single();
    if (!p || p.status !== "ready" || !p.latest_release_id)
      return NextResponse.json(
        { error: "สินค้ายังไม่เปิดให้ดาวน์โหลด" },
        { status: 403 },
      );
    const { data: release } = await db
      .from("store_releases")
      .select("*")
      .eq("id", p.latest_release_id)
      .eq("product_id", p.id)
      .not("tested_at", "is", null)
      .single();
    if (!release)
      return NextResponse.json(
        { error: "ยังไม่มี release ที่ตรวจรับแล้ว" },
        { status: 403 },
      );
    const { data: grants, error } = await db
      .from("store_grants")
      .select("id,store_orders!inner(status)")
      .eq("user_id", user.id)
      .eq("product_id", p.id)
      .is("revoked_at", null)
      .eq("store_orders.status", "paid")
      .limit(1);
    if (error || (!isAdmin && !(isVip && p.vip_free) && !grants?.length)) {
      await db.from("store_audit").insert({
        actor_id: user.id,
        action: "download.denied",
        target_id: p.id,
      });
      return NextResponse.json(
        { error: "ไม่มีสิทธิ์ดาวน์โหลด" },
        { status: 403, headers: privateHeaders },
      );
    }
    const { data, error: signError } = await db.storage
      .from("store-releases")
      .createSignedUrl(release.storage_path, 60, { download: true });
    if (signError || !data)
      return NextResponse.json(
        { error: "ไม่พบไฟล์ กรุณาติดต่อผู้ดูแล" },
        { status: 404 },
      );
    const { error: auditError } = await db.rpc("store_record_download", {
      p_user: user.id,
      p_product: p.id,
    });
    if (auditError)
      return NextResponse.json(
        { error: "ไม่สามารถบันทึกการดาวน์โหลด" },
        { status: 503 },
      );
    return new NextResponse(null, {
      status: 302,
      headers: { ...privateHeaders, Location: data.signedUrl },
    });
  } catch {
    return NextResponse.json(
      { error: "ไม่สามารถดาวน์โหลดได้ในขณะนี้" },
      { status: 503, headers: privateHeaders },
    );
  }
}
