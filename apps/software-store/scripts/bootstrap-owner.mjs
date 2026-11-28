import { createClient } from "@supabase/supabase-js";
const [mode, id, slug, name] = process.argv.slice(2);
if (!["store", "school"].includes(mode) || !/^[-a-f0-9]{36}$/.test(id ?? ""))
  throw Error(
    "Usage: node --env-file=.env.local scripts/bootstrap-owner.mjs store <user-uuid> OR school <user-uuid> <slug> <school-name>",
  );
const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);
const { data, error } = await db.auth.admin.getUserById(id);
if (error || !data.user?.email_confirmed_at)
  throw Error("Owner must be a registered, email-confirmed user");
if (mode === "store") {
  const { error } = await db
    .from("store_profiles")
    .upsert({ id, is_admin: true });
  if (error) throw Error("Failed to configure store owner");
  await db
    .from("store_audit")
    .insert({ actor_id: id, action: "owner.bootstrapped", target_id: id });
} else {
  if (!slug || !name) throw Error("School slug and name are required");
  const { error } = await db.rpc("school_provision", {
    p_actor: null,
    p_owner: id,
    p_slug: slug,
    p_name: name,
  });
  if (error) throw Error("Failed to create school; inspect safe database logs");
}
process.stdout.write(
  "Owner configuration saved. No credentials were printed.\n",
);
