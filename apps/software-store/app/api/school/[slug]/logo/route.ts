import { NextResponse } from "next/server";
import { schoolPublic } from "@/lib/school";
import { createAdmin } from "@/lib/supabase/server";
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const site = await schoolPublic((await params).slug);
    if (!site?.logo_path) return new NextResponse(null, { status: 404 });
    const { data, error } = await createAdmin()
      .storage.from("school-branding")
      .download(site.logo_path);
    if (error || !data) return new NextResponse(null, { status: 404 });
    return new NextResponse(await data.arrayBuffer(), {
      headers: {
        "Content-Type": "image/png",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
