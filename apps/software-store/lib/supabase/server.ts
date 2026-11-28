import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient as adminClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { configured } from "@/lib/env";
export async function createClient() {
  if (!configured()) throw new Error("DATABASE_NOT_CONFIGURED");
  const store = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => store.getAll(),
        setAll: (list) => {
          try {
            list.forEach(({ name, value, options }) =>
              store.set(name, value, {
                ...options,
                sameSite: "lax",
                secure:
                  process.env.APP_URL?.startsWith("https://") ??
                  process.env.NODE_ENV === "production",
              }),
            );
          } catch {
            /* Read-only Server Component; refreshed by middleware. */
          }
        },
      },
    },
  );
}
export function createAdmin() {
  if (!configured() || !process.env.SUPABASE_SERVICE_ROLE_KEY)
    throw new Error("SERVER_DATABASE_NOT_CONFIGURED");
  return adminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
