import { NextResponse } from "next/server";
import { getViewer } from "@/lib/shop";
import { createClient, createAdmin } from "@/lib/supabase/server";
import { uuid } from "@/lib/security";
import { privateHeaders } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { user } = await getViewer();
    if (!user)
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    await rateLimit("school-document-read", user.id, 20);
    const id = uuid.parse((await params).id);
    const { data: doc } = await (await createClient())
      .from("school_documents")
      .select("id,school_id,storage_path")
      .eq("id", id)
      .single();
    if (!doc) return NextResponse.json({ error: "not found" }, { status: 404 });
    const db = createAdmin();
    const { data, error } = await db.storage
      .from("school-documents")
      .createSignedUrl(doc.storage_path, 60);
    if (error || !data)
      return NextResponse.json({ error: "not found" }, { status: 404 });
    const { error: auditError } = await db.from("store_audit").insert({
      actor_id: user.id,
      action: "application.document-read",
      target_id: doc.id,
      details: { school_id: doc.school_id },
    });
    if (auditError) throw auditError;
    return new NextResponse(null, {
      status: 302,
      headers: { ...privateHeaders, Location: data.signedUrl },
    });
  } catch {
    return NextResponse.json({ error: "unavailable" }, { status: 403 });
  }
}
