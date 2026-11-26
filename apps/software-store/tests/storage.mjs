import assert from "node:assert/strict";
import { randomUUID, createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import pg from "pg";
import sharp from "sharp";
import { createClient } from "@supabase/supabase-js";
import { fixtureZip } from "./local/release-fixture.mjs";

const origin = "http://127.0.0.1:55431";
if (
  process.env.NEXT_PUBLIC_SUPABASE_URL !== origin ||
  process.env.TEST_DATABASE_URL !==
    "postgres://postgres:local-test-only@127.0.0.1:55432/postgres" ||
  process.env.TEST_STORAGE_API !== "true"
)
  throw Error(
    "Real Storage tests require the disposable local stack with TEST_STORAGE_API=true",
  );
const accounts = JSON.parse(readFileSync("tests/local/.accounts.json", "utf8"));
const db = new pg.Client({ connectionString: process.env.TEST_DATABASE_URL });
await db.connect();
const options = { auth: { persistSession: false, autoRefreshToken: false } };
const service = createClient(
  origin,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  options,
);
const anon = createClient(
  origin,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  options,
);
const attacker = createClient(
  origin,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  options,
);
const signedIn = await attacker.auth.signInWithPassword(accounts.attacker);
if (signedIn.error) throw Error("Storage test account could not sign in");
const tests = [];
const prefix = `storage-check/${randomUUID()}`;
const filePath = `${prefix}/synthetic.png`;
const bytes = await sharp({
  create: { width: 12, height: 12, channels: 4, background: "#302e70" },
})
  .png()
  .toBuffer();
const sha = (b) => createHash("sha256").update(b).digest("hex");
function must(result, label) {
  if (result.error)
    throw Error(
      `${label} failed (HTTP ${result.error.statusCode ?? result.error.status ?? "unknown"})`,
    );
  return result.data;
}
function safeUrl(value) {
  const u = new URL(value);
  assert(
    u.origin === origin && u.pathname.startsWith("/storage/v1/"),
    "Storage response must stay on the disposable gateway",
  );
  return u;
}
async function get(value) {
  try {
    return await fetch(safeUrl(value), {
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    throw Error("Local Storage download request failed");
  }
}
async function test(name, run) {
  try {
    await run();
    tests.push({ name, passed: true });
    process.stdout.write(`PASS ${name}\n`);
  } catch (e) {
    tests.push({ name, passed: false });
    const detail = String(e.message ?? e)
      .replace(/https?:\/\/\S+/g, "[URL redacted]")
      .replace(
        /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,
        "[JWT redacted]",
      )
      .slice(0, 500);
    throw Error(`Real Storage check failed: ${name}: ${detail}`);
  }
}
try {
  await test("all four application buckets are private through the real Storage API", async () => {
    for (const bucket of [
      "store-releases",
      "store-slips",
      "school-documents",
      "school-branding",
    ]) {
      const data = must(await service.storage.getBucket(bucket), "Get bucket");
      assert.equal(data.public, false);
    }
  });
  await test("service uploads a private image with zero cache lifetime and exact bytes", async () => {
    must(
      await service.storage.from("school-documents").upload(filePath, bytes, {
        contentType: "image/png",
        cacheControl: "0",
      }),
      "Upload image",
    );
    const downloaded = must(
      await service.storage.from("school-documents").download(filePath),
      "Download image",
    );
    assert.equal(sha(Buffer.from(await downloaded.arrayBuffer())), sha(bytes));
  });
  await test("anonymous and another authenticated user cannot read, upload, list or sign private objects despite a legacy permissive policy", async () => {
    for (const client of [anon, attacker]) {
      assert(
        (await client.storage.from("school-documents").download(filePath))
          .error,
      );
      assert(
        (
          await client.storage
            .from("school-documents")
            .upload(`${prefix}/${randomUUID()}.png`, bytes, {
              contentType: "image/png",
            })
        ).error,
      );
      assert(
        (
          await client.storage
            .from("school-documents")
            .createSignedUrl(filePath, 60)
        ).error,
      );
      const listed = await client.storage.from("school-documents").list(prefix);
      assert(listed.error || listed.data?.length === 0);
    }
  });
  await test("private objects cannot be fetched through public URLs", async () => {
    const { data } = service.storage
      .from("school-documents")
      .getPublicUrl(filePath);
    assert.notEqual((await get(data.publicUrl)).status, 200);
  });
  await test("signed private downloads return the original bytes with max-age zero", async () => {
    const data = must(
      await service.storage
        .from("school-documents")
        .createSignedUrl(filePath, 60),
      "Sign image",
    );
    const response = await get(data.signedUrl);
    assert.equal(response.status, 200);
    assert.match(response.headers.get("cache-control") ?? "", /max-age=0\b/);
    assert.equal(sha(Buffer.from(await response.arrayBuffer())), sha(bytes));
  });
  await test("tampered signed URLs are rejected", async () => {
    const data = must(
      await service.storage
        .from("school-documents")
        .createSignedUrl(filePath, 60),
      "Sign image",
    );
    const u = safeUrl(data.signedUrl);
    const token = u.searchParams.get("token");
    assert(token, "Storage API must return a bearer token");
    u.searchParams.set(
      "token",
      (token[0] === "a" ? "b" : "a") + token.slice(1),
    );
    assert.notEqual((await get(u)).status, 200);
  });
  await test("signed URLs expire at the real Storage origin", async () => {
    const data = must(
      await service.storage
        .from("school-documents")
        .createSignedUrl(filePath, 1),
      "Sign short-lived image",
    );
    assert.equal((await get(data.signedUrl)).status, 200);
    await new Promise((r) => setTimeout(r, 2300));
    const u = safeUrl(data.signedUrl);
    u.searchParams.set("cacheNonce", randomUUID());
    assert.notEqual((await get(u)).status, 200);
  });
  await test("bucket MIME and size restrictions reject disallowed uploads", async () => {
    assert(
      (
        await service.storage
          .from("school-documents")
          .upload(
            `${prefix}/unsafe.html`,
            Buffer.from("<script>fixture</script>"),
            { contentType: "text/html" },
          )
      ).error,
    );
    assert(
      (
        await service.storage
          .from("school-documents")
          .upload(`${prefix}/too-large.png`, Buffer.alloc(6 * 1024 * 1024), {
            contentType: "image/png",
          })
      ).error,
    );
  });
  await test("existing legacy bucket policies still work without exposing the application's private buckets", async () => {
    const path = `${prefix}/legacy.txt`;
    must(
      await service.storage
        .from("legacy-test")
        .upload(path, "synthetic legacy data", {
          contentType: "text/plain",
          cacheControl: "0",
        }),
      "Upload legacy fixture",
    );
    const data = must(
      await attacker.storage.from("legacy-test").download(path),
      "Read legacy fixture",
    );
    assert.equal(await data.text(), "synthetic legacy data");
    must(
      await service.storage.from("legacy-test").remove([path]),
      "Remove legacy fixture",
    );
  });
  await test("release ZIPs exist privately with hashes matching metadata for the browser checkout/download test", async () => {
    const zip = await fixtureZip();
    const rows = await db.query(
      "select r.id,r.storage_path from public.store_releases r join public.store_products p on p.latest_release_id=r.id where p.id=any($1::uuid[])",
      [[accounts.pid, accounts.pid2]],
    );
    assert.equal(rows.rows.length, 2);
    for (const r of rows.rows) {
      must(
        await service.storage
          .from("store-releases")
          .upload(r.storage_path, zip, {
            contentType: "application/zip",
            cacheControl: "0",
            upsert: true,
          }),
        "Upload release fixture",
      );
      await db.query("update public.store_releases set sha256=$2 where id=$1", [
        r.id,
        sha(zip),
      ]);
    }
  });
  await test("a synthetic school document exists privately for browser cross-school access checks", async () => {
    const path = `${prefix}/admission.png`;
    must(
      await service.storage
        .from("school-documents")
        .upload(path, bytes, { contentType: "image/png", cacheControl: "0" }),
      "Upload document fixture",
    );
    await db.query(
      "insert into public.school_documents(school_id,application_id,kind,storage_path,sha256) values($1,$2,'identity',$3,$4)",
      [accounts.school, accounts.application, path, sha(bytes)],
    );
  });
  await test("deleting a private object invalidates its previously signed URL at the origin", async () => {
    const data = must(
      await service.storage
        .from("school-documents")
        .createSignedUrl(filePath, 60),
      "Sign image",
    );
    must(
      await service.storage.from("school-documents").remove([filePath]),
      "Remove image",
    );
    assert.notEqual((await get(data.signedUrl)).status, 200);
  });
} finally {
  writeFileSync(
    "docs/STORAGE-RESULTS.json",
    JSON.stringify(
      {
        checked_at: new Date().toISOString(),
        source_commit: process.env.GITHUB_SHA ?? null,
        head_commit: process.env.STORE_SOURCE_COMMIT ?? null,
        environment:
          "Real Supabase Storage API v1.98.6 + PostgreSQL 17 + GoTrue + PostgREST, disposable file backend; synthetic data only",
        passed: tests.filter((t) => t.passed).length,
        failed: tests.filter((t) => !t.passed).length,
        tests,
        hosted_storage_verified: false,
        cdn_expiry_verified: false,
        notes: [
          "Synthetic ZIP bytes are a test fixture, not a sale product.",
          "Hosted Supabase/CDN and physical device acceptance are separate checks.",
          "Signed URLs and credentials are excluded from this report.",
        ],
      },
      null,
      2,
    ) + "\n",
  );
  await db.end();
}
process.stdout.write(`${tests.length} real Storage API checks passed.\n`);
