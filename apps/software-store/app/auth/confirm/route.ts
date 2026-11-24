import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/security";
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const hash = sp.get("token_hash");
  const code = sp.get("code");
  const type = sp.get("type");
  const db = await createClient();
  let ok = false;
  if (code) {
    const { error } = await db.auth.exchangeCodeForSession(code);
    ok = !error;
  } else if (
    hash &&
    (type === "email" || type === "recovery" || type === "signup")
  ) {
    const { error } = await db.auth.verifyOtp({ token_hash: hash, type });
    ok = !error;
  }
  return NextResponse.redirect(
    new URL(
      ok ? safeNext(sp.get("next")) : "/login?error=confirmation",
      req.url,
    ),
  );
}
