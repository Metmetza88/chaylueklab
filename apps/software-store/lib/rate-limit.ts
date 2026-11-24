import "server-only";
import { createHash } from "node:crypto";
import { createAdmin } from "@/lib/supabase/server";
export async function rateLimit(
  scope: string,
  identity: string,
  limit = 20,
  seconds = 60,
) {
  const key = createHash("sha256").update(`${scope}:${identity}`).digest("hex");
  const { data, error } = await createAdmin().rpc("store_take_rate_limit", {
    p_key: key,
    p_limit: limit,
    p_seconds: seconds,
  });
  if (error || data !== true) throw new Error("RATE_LIMITED");
}
