import "server-only";
import { cache } from "react";
import { createClient, createAdmin } from "@/lib/supabase/server";
import { configured } from "@/lib/env";
import drafts from "@/lib/catalog.json";
export type Product = {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  category: string;
  price_cents: number;
  status: string;
  vip_free: boolean;
  kind: string;
  features: string[];
  latest_release_id: string | null;
};
export { money as baht } from "@/lib/procurement";
export const getViewer = cache(async () => {
  if (!configured()) return { user: null, isVip: false, isAdmin: false };
  const db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return { user: null, isVip: false, isAdmin: false };
  const { data: p } = await db
    .from("store_profiles")
    .select("vip_until,is_admin")
    .eq("id", user.id)
    .maybeSingle();
  return {
    user,
    isVip: !!p?.vip_until && new Date(p.vip_until) > new Date(),
    isAdmin: p?.is_admin === true,
  };
});
export const getProducts = cache(
  async (): Promise<{
    products: Product[];
    source: "database" | "roadmap" | "error";
  }> => {
    if (!configured())
      return { products: drafts as Product[], source: "roadmap" };
    const db = await createClient();
    const { data, error } = await db
      .from("store_products")
      .select("*")
      .neq("status", "archived")
      .order("slug");
    if (error) return { products: [], source: "error" };
    return { products: (data ?? []) as Product[], source: "database" };
  },
);
export async function requireUser() {
  const v = await getViewer();
  if (!v.user) throw new Error("UNAUTHENTICATED");
  return v.user;
}
export async function requireAdmin() {
  const v = await getViewer();
  if (!v.user || !v.isAdmin) throw new Error("FORBIDDEN");
  return { user: v.user, db: createAdmin() };
}
