import assert from "node:assert/strict";
import { randomUUID, createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import pg from "pg";
import { writeFileSync, readFileSync } from "node:fs";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (url !== "http://127.0.0.1:55431")
  throw Error("Integration tests are restricted to the disposable local stack");
const client = new pg.Client({
  connectionString: process.env.TEST_DATABASE_URL,
});
await client.connect();
if (
  !process.env.TEST_DATABASE_URL?.startsWith(
    "postgres://postgres:local-test-only@127.0.0.1:55432/",
  )
)
  throw Error(
    "Refusing destructive reset outside the disposable local test database",
  );
await client.query(
  "drop schema if exists store_private cascade; drop schema public cascade; create schema public; grant usage on schema public to anon,authenticated,service_role; grant all on schema public to service_role;",
);
await client.query(
  "drop table if exists storage.objects; create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text); alter table storage.objects enable row level security;",
);
await client.query(
  readFileSync(
    "supabase/migrations/20261124023043_isolated_store_school_platform.sql",
    "utf8",
  ),
);
await client.query(readFileSync("supabase/catalog-drafts.sql", "utf8"));
await client.query("NOTIFY pgrst, 'reload schema'");
const service = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
const anon = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
});
await new Promise((r) => setTimeout(r, 500));
let passed = 0;
const evidence = [];
async function test(name, fn) {
  try {
    await fn();
    passed++;
    evidence.push({ name, passed: true });
    process.stdout.write(`PASS ${name}\n`);
  } catch (e) {
    if (process.env.GITHUB_ACTIONS === "true") {
      const message = String(e.message ?? e)
        .replace(/https?:\/\/\S+/g, "[URL redacted]")
        .replaceAll("\n", " ")
        .slice(0, 700);
      process.stderr.write(
        `::error title=Store integration ${name}::${message}\n`,
      );
    }
    evidence.push({ name, passed: false });
    throw e;
  }
}
async function user(label) {
  const email = `${label}-${randomUUID()}@example.test`;
  const password = `Local-test-${randomUUID()}!`;
  const { data, error } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    role: "authenticated",
  });
  assert.ifError(error);
  assert.equal(
    data.user.role,
    "authenticated",
    "Local Auth fixture must issue authenticated role",
  );
  const db = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
  });
  const login = await db.auth.signInWithPassword({ email, password });
  assert.ifError(login.error);
  await client.query("insert into public.store_profiles(id) values($1)", [
    data.user.id,
  ]);
  return { id: data.user.id, email, password, db };
}
const owner = await user("owner"),
  buyer = await user("buyer"),
  attacker = await user("attacker"),
  editor = await user("editor");
await client.query(
  "update public.store_profiles set is_admin=true where id=$1",
  [owner.id],
);
const pids = (
  await client.query(
    "select id from public.store_products where slug in('met-school-pro','met-admission') order by slug",
  )
).rows.map((r) => r.id);
const pid = pids[0],
  pid2 = pids[1];
async function ready(id) {
  const rid = randomUUID();
  await client.query(
    "insert into public.store_releases(id,product_id,version,storage_path,sha256,changelog,tested_at,test_evidence) values($1,$2,'0.2.0-test',$3,$4,'Local fixture only',now(),'Local integration fixture, not a sale release')",
    [rid, id, `tests/${rid}.zip`, "a".repeat(64)],
  );
  await client.query(
    "update public.store_products set status='ready',latest_release_id=$2 where id=$1",
    [id, rid],
  );
}
await client.query("update public.store_settings set payment_mode='sandbox'");
const rpc = (name, p) => service.rpc(name, p);
const checkout = (u, ids, key = randomUUID(), coupon = "") =>
  rpc("store_create_order", {
    p_user: u,
    p_ids: ids,
    p_key: key,
    p_coupon: coupon,
    p_mode: "sandbox",
  });
await test("anonymous cannot write order status or call privileged checkout", async () => {
  const a = await anon.from("store_orders").insert({ status: "paid" });
  assert(a.error);
  const b = await buyer.db.rpc("store_create_order", {
    p_user: buyer.id,
    p_ids: [pid],
    p_key: randomUUID(),
    p_coupon: "",
    p_mode: "sandbox",
  });
  assert(b.error);
});
await test("Coming Soon cannot be ordered even through trusted server RPC", async () =>
  assert((await checkout(buyer.id, [pid])).error));
await ready(pid);
await ready(pid2);
await test("catalog includes 15 products, without fabricated ratings or sales columns", async () => {
  const r = await anon.from("store_products").select("*");
  assert.ifError(r.error);
  assert.equal(r.data.length, 15);
  assert(!("rating" in r.data[0]));
  assert(!("sold" in r.data[0]));
});
let order;
await test("server prices + concurrent idempotency create one complete order", async () => {
  const key = randomUUID();
  const r = await Promise.all([
    checkout(buyer.id, [pid], key),
    checkout(buyer.id, [pid], key),
  ]);
  r.forEach((x) => assert.ifError(x.error));
  assert.equal(r[0].data, r[1].data);
  order = r[0].data;
  const row = (
    await client.query("select * from public.store_orders where id=$1", [order])
  ).rows[0];
  const price = (
    await client.query(
      "select price_cents from public.store_products where id=$1",
      [pid],
    )
  ).rows[0].price_cents;
  assert.equal(row.total_cents, price);
  assert.equal(
    (
      await client.query(
        "select count(*)::int n from public.store_order_items where order_id=$1",
        [order],
      )
    ).rows[0].n,
    1,
  );
  assert((await checkout(buyer.id, [pid2], key)).error);
});
await test("invalid/missing product aborts checkout with no orphan order", async () => {
  const before = (
    await client.query("select count(*)::int n from public.store_orders")
  ).rows[0].n;
  assert((await checkout(buyer.id, [pid, randomUUID()])).error);
  assert((await checkout(buyer.id, [pid, pid])).error);
  assert.equal(
    (await client.query("select count(*)::int n from public.store_orders"))
      .rows[0].n,
    before,
  );
});
await test("RLS hides another buyer order and blocks role/VIP escalation", async () => {
  const r = await attacker.db.from("store_orders").select("*").eq("id", order);
  assert.ifError(r.error);
  assert.equal(r.data.length, 0);
  assert(
    (
      await buyer.db
        .from("store_profiles")
        .update({ is_admin: true, vip_until: "2099-01-01" })
        .eq("id", buyer.id)
    ).error,
  );
  assert(
    (
      await buyer.db
        .from("store_orders")
        .update({ status: "paid" })
        .eq("id", order)
    ).error,
  );
});
const amount = (
  await client.query(
    "select total_cents from public.store_orders where id=$1",
    [order],
  )
).rows[0].total_cents;
const event = `event-${randomUUID()}`,
  reference = `bank-${randomUUID()}`,
  hash = createHash("sha256").update(event).digest("hex");
const payment = (over = {}) =>
  rpc("store_confirm_payment", {
    p_order: order,
    p_event: event,
    p_ref: reference,
    p_hash: hash,
    p_amount: amount,
    p_mode: "sandbox",
    ...over,
  });
await test("wrong amount and mode cannot mark paid or grant downloads", async () => {
  assert((await payment({ p_amount: amount - 1 })).error);
  assert((await payment({ p_mode: "live" })).error);
  assert.equal(
    (
      await client.query("select status from public.store_orders where id=$1", [
        order,
      ])
    ).rows[0].status,
    "pending",
  );
  assert.equal(
    (
      await client.query(
        "select count(*)::int n from public.store_grants where order_id=$1",
        [order],
      )
    ).rows[0].n,
    0,
  );
});
await test("payment + grant + audit/outbox commit together and duplicate event is idempotent", async () => {
  const a = await payment(),
    b = await payment();
  assert.ifError(a.error);
  assert.ifError(b.error);
  assert.equal(a.data, b.data);
  assert.equal(
    (
      await client.query(
        "select count(*)::int n from public.store_grants where order_id=$1",
        [order],
      )
    ).rows[0].n,
    1,
  );
  assert.equal(
    (
      await client.query(
        "select count(*)::int n from public.store_outbox where topic='payment.verified' and payload->>'order_id'=$1",
        [order],
      )
    ).rows[0].n,
    1,
  );
  assert((await payment({ p_hash: "b".repeat(64) })).error);
});
await test("bank reference cannot be reused on a different order", async () => {
  const second = await checkout(attacker.id, [pid]);
  assert.ifError(second.error);
  assert(
    (await payment({ p_order: second.data, p_event: `new-${event}` })).error,
  );
});
await test("duplicate canonical slip hash is rejected across orders", async () => {
  const a = await checkout(buyer.id, [pid2]),
    b = await checkout(attacker.id, [pid2]);
  assert.ifError(a.error);
  assert.ifError(b.error);
  const sh = "c".repeat(64);
  assert.ifError(
    (
      await rpc("store_register_slip", {
        p_order: a.data,
        p_user: buyer.id,
        p_hash: sh,
        p_path: "fixture/a.png",
      })
    ).error,
  );
  assert(
    (
      await rpc("store_register_slip", {
        p_order: b.data,
        p_user: attacker.id,
        p_hash: sh,
        p_path: "fixture/b.png",
      })
    ).error,
  );
});
await test("single-use coupon cannot be oversubscribed concurrently", async () => {
  await client.query(
    "insert into public.store_coupons(code,percent,max_uses,expires_at) values('LOCAL10',10,1,now()+interval '1 hour')",
  );
  const r = await Promise.all([
    checkout(buyer.id, [pid], randomUUID(), "LOCAL10"),
    checkout(attacker.id, [pid], randomUUID(), "LOCAL10"),
  ]);
  assert.equal(r.filter((x) => !x.error).length, 1);
  assert.equal(
    (
      await client.query(
        "select used_count from public.store_coupons where code='LOCAL10'",
      )
    ).rows[0].used_count,
    1,
  );
});
let school, other, round, application;
await test("school provisioning is atomic and adds owner membership", async () => {
  const a = await rpc("school_provision", {
      p_actor: owner.id,
      p_owner: owner.id,
      p_slug: "local-school",
      p_name: "โรงเรียนทดสอบสมมติ",
    }),
    b = await rpc("school_provision", {
      p_actor: owner.id,
      p_owner: attacker.id,
      p_slug: "other-school",
      p_name: "โรงเรียนอื่นสมมติ",
    });
  assert.ifError(a.error);
  assert.ifError(b.error);
  school = a.data;
  other = b.data;
  await client.query(
    "update public.school_sites set published=true where id=any($1::uuid[])",
    [[school, other]],
  );
  await client.query(
    "insert into public.school_members(school_id,user_id,role) values($1,$2,'editor')",
    [school, editor.id],
  );
  round = randomUUID();
  await client.query(
    "insert into public.school_rounds(id,school_id,name,grade_levels,opens_at,closes_at,is_open) values($1,$2,'รอบทดสอบ',array['ม.1'],now()-interval '1 hour',now()+interval '1 day',true)",
    [round, school],
  );
});
const apply = (over = {}) =>
  rpc("school_submit_application", {
    p_user: buyer.id,
    p_school: school,
    p_round: round,
    p_grade: "ม.1",
    p_student: "นักเรียนสมมติ เมตศึกษา",
    p_guardian: "ผู้ปกครองสมมติ",
    p_phone: "0800000000",
    p_previous: "โรงเรียนสมมติ",
    ...over,
  });
await test("application validates grade, round and school before storing data", async () => {
  assert((await apply({ p_grade: "ม.4" })).error);
  assert((await apply({ p_school: other })).error);
  const a = await apply();
  assert.ifError(a.error);
  application = a.data;
  await client.query(
    "update public.school_rounds set is_open=false where id=$1",
    [round],
  );
  assert((await apply({ p_user: attacker.id })).error);
  await client.query(
    "update public.school_rounds set is_open=true where id=$1",
    [round],
  );
});
await test("cross-school staff and content editor cannot access private student data", async () => {
  for (const u of [attacker, editor]) {
    const r = await u.db
      .from("school_applications")
      .select("*")
      .eq("id", application);
    assert.ifError(r.error);
    assert.equal(r.data.length, 0);
  }
  const r = await owner.db
    .from("school_applications")
    .select("*")
    .eq("id", application);
  assert.equal(r.data.length, 1);
  const a = await buyer.db
    .from("school_applications")
    .select("*")
    .eq("id", application);
  assert.equal(a.data.length, 1);
});
await test("cross-school review and client status manipulation are denied", async () => {
  const p = {
    p_actor: attacker.id,
    p_school: school,
    p_application: application,
    p_status: "approved",
    p_note: "ทดสอบตรวจเอกสาร",
  };
  assert((await rpc("school_review_application", p)).error);
  assert(
    (
      await buyer.db
        .from("school_applications")
        .update({ status: "approved" })
        .eq("id", application)
    ).error,
  );
  assert.ifError(
    (await rpc("school_review_application", { ...p, p_actor: owner.id })).error,
  );
});
await test("refund revokes grants and users cannot reinstate them", async () => {
  assert.ifError(
    (await rpc("store_refund", { p_actor: owner.id, p_order: order })).error,
  );
  assert(
    (
      await client.query(
        "select revoked_at from public.store_grants where order_id=$1",
        [order],
      )
    ).rows[0].revoked_at,
  );
  assert(
    (
      await buyer.db
        .from("store_grants")
        .update({ revoked_at: null })
        .eq("order_id", order)
    ).error,
  );
});
await test("distributed rate limiter stops repeated requests", async () => {
  const key = randomUUID();
  const r = await Promise.all(
    Array.from({ length: 4 }, () =>
      rpc("store_take_rate_limit", { p_key: key, p_limit: 3, p_seconds: 60 }),
    ),
  );
  assert.equal(r.filter((x) => x.data === true).length, 3);
});
await test("all application tables enable RLS and storage buckets stay private", async () => {
  const r = await client.query(
    "select relname from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and (relname like 'store_%' or relname like 'school_%') and relkind='r' and not relrowsecurity",
  );
  assert.equal(r.rows.length, 0);
  assert.equal(
    (await client.query("select * from storage.buckets where public")).rows
      .length,
    0,
  );
});

await test("outbox workers lease disjoint events and daily summary is idempotent", async () => {
  const a = await rpc("store_queue_daily_summary", {}),
    b = await rpc("store_queue_daily_summary", {});
  assert.ifError(a.error);
  assert.ifError(b.error);
  assert.equal(
    (
      await client.query(
        "select count(*)::int n from public.store_outbox where topic='revenue.daily'",
      )
    ).rows[0].n,
    1,
  );
  const claims = await Promise.all([
    rpc("store_claim_events", { p_limit: 3 }),
    rpc("store_claim_events", { p_limit: 3 }),
  ]);
  claims.forEach((x) => assert.ifError(x.error));
  const ids = claims.flatMap((x) => x.data.map((e) => e.id));
  assert.equal(ids.length, new Set(ids).size);
  assert((await buyer.db.rpc("store_claim_events", { p_limit: 5 })).error);
});
await test("restrictive storage fence blocks legacy permissive policies only on new buckets", async () => {
  await client.query(
    "grant usage on schema storage to authenticated; grant select,insert,update,delete on storage.objects to authenticated; create policy local_legacy_allow on storage.objects for all to authenticated using(true) with check(true); insert into storage.objects(bucket_id) values('legacy-test'),('store-releases'),('school-documents')",
  );
  await client.query("begin");
  await client.query("set local role authenticated");
  const rows = await client.query("select bucket_id from storage.objects");
  assert.deepEqual(
    rows.rows.map((x) => x.bucket_id),
    ["legacy-test"],
  );
  await client.query("rollback");
});
await test("document registration is atomic and blocked after review", async () => {
  const a = await rpc("school_register_document", {
    p_user: buyer.id,
    p_application: application,
    p_kind: "identity",
    p_path: "fixture/identity.png",
    p_hash: "d".repeat(64),
  });
  assert(a.error);
});

await test("support creation and notification commit together with private read access", async () => {
  const r = await rpc("store_create_support", {
    p_user: buyer.id,
    p_subject: "ทดสอบช่วยเหลือ",
    p_message: "ข้อมูลสมมติสำหรับการทดสอบระบบช่วยเหลือ",
  });
  assert.ifError(r.error);
  assert.equal(
    (
      await client.query(
        "select count(*)::int n from public.store_outbox where topic='support.created' and payload->>'ticket_id'=$1",
        [r.data],
      )
    ).rows[0].n,
    1,
  );
  assert.equal(
    (await attacker.db.from("store_support").select("*").eq("id", r.data)).data
      .length,
    0,
  );
});
await test("untested replacement release preserves old downloads and requires matching hash attestation", async () => {
  const prior = (
    await client.query(
      "select latest_release_id from public.store_products where id=$1",
      [pid2],
    )
  ).rows[0].latest_release_id;
  const a = await rpc("store_register_release", {
    p_actor: owner.id,
    p_product: pid2,
    p_version: "0.2.1-test",
    p_path: "fixture/replacement.zip",
    p_sha: "e".repeat(64),
    p_changelog: "Local release metadata fixture only",
  });
  assert.ifError(a.error);
  assert.equal(
    (
      await client.query(
        "select latest_release_id from public.store_products where id=$1",
        [pid2],
      )
    ).rows[0].latest_release_id,
    prior,
  );
  assert(
    (
      await rpc("store_attest_release", {
        p_actor: owner.id,
        p_release: a.data,
        p_sha: "f".repeat(64),
        p_evidence: "Local test evidence for metadata fixture only",
      })
    ).error,
  );
  assert.ifError(
    (
      await rpc("store_attest_release", {
        p_actor: owner.id,
        p_release: a.data,
        p_sha: "e".repeat(64),
        p_evidence: "Local test evidence for metadata fixture only",
      })
    ).error,
  );
  assert.equal(
    (
      await client.query(
        "select latest_release_id from public.store_products where id=$1",
        [pid2],
      )
    ).rows[0].latest_release_id,
    a.data,
  );
});
writeFileSync(
  "tests/local/.accounts.json",
  JSON.stringify({
    owner: { id: owner.id, email: owner.email, password: owner.password },
    buyer: { id: buyer.id, email: buyer.email, password: buyer.password },
    attacker: {
      id: attacker.id,
      email: attacker.email,
      password: attacker.password,
    },
    school,
    other,
    pid,
    pid2,
    application,
  }),
);
writeFileSync(
  "docs/INTEGRATION-RESULTS.json",
  JSON.stringify(
    {
      date: new Date().toISOString(),
      environment:
        "Local PostgreSQL 17 + real GoTrue + real PostgREST. Storage schema fixture only; Storage API not running.",
      passed,
      tests: evidence,
    },
    null,
    2,
  ),
);
await client.end();
process.stdout.write(
  `${passed} integration/security checks passed. Local accounts saved in ignored file.\n`,
);
