import "server-only";
import { createClient, createAdmin } from "@/lib/supabase/server";
import { requireUser } from "@/lib/shop";
export async function schoolPublic(slug: string) {
  const db = await createClient();
  const { data } = await db
    .from("school_sites")
    .select("*")
    .eq("slug", slug)
    .single();
  return data;
}
export async function schoolStaff(
  slug: string,
  roles = ["owner", "officer", "editor", "executive"],
) {
  const user = await requireUser();
  const db = createAdmin();
  const { data: site } = await db
    .from("school_sites")
    .select("*")
    .eq("slug", slug)
    .single();
  if (!site) throw new Error("FORBIDDEN");
  const { data: member } = await db
    .from("school_members")
    .select("role")
    .eq("school_id", site.id)
    .eq("user_id", user.id)
    .single();
  if (!member || !roles.includes(member.role)) throw new Error("FORBIDDEN");
  return { user, db, site, role: member.role };
}
