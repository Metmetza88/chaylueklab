import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sameOrigin } from "@/lib/security";
export async function POST(req: NextRequest) {
  if (!sameOrigin(req))
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  await (await createClient()).auth.signOut();
  return NextResponse.redirect(new URL("/", req.url), 303);
}
