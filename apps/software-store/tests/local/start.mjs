// Starts only containers named woramet-store-test-*. Never uses hosted database credentials.
import { spawnSync } from "node:child_process";
import { writeFileSync, readFileSync } from "node:fs";
import { createHmac, randomBytes } from "node:crypto";
// Docker Hub mirrors the same immutable Supabase fixture manifests as ECR Public.
const authImage =
  "supabase/gotrue@sha256:ba8c0c82c574756c835c696df2a2c698020cc408a42034013d3712e34de7964d"; // v2.198.0
const restImage =
  "postgrest/postgrest@sha256:5ce030c153500fe90ba157da4da8ba99ab51d3bc7b95e071bd0b544b67a632f7"; // v16.6
const storageImage =
  "supabase/storage-api@sha256:b09a1904222a7bcc750b00c375c24e7409e7e514474dbc1bd9183bc57cc95bde"; // v1.98.6
const storageEnabled = process.env.TEST_STORAGE_API === "true";
const appUrl = process.env.TEST_APP_URL || "http://127.0.0.1:3000";
if (!/^http:\/\/(?:127\.0\.0\.1|localhost):\d{2,5}$/.test(appUrl)) {
  throw Error(
    "TEST_APP_URL must be a loopback HTTP origin with an explicit port",
  );
}
const run = (args, input) => {
  const r = spawnSync("docker", args, {
    input,
    encoding: "utf8",
    stdio: input ? ["pipe", "pipe", "pipe"] : ["ignore", "pipe", "pipe"],
  });
  if (r.status !== 0)
    throw Error(
      `Local test container command failed: ${args.slice(0, 3).join(" ")}: ${String(
        r.stderr,
      )
        .replace(/https?:\/\/\S+/g, "[URL redacted]")
        .replace(
          /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,
          "[TOKEN redacted]",
        )
        .slice(-1200)}`,
    );
  return r.stdout;
};
for (const name of [
  "woramet-store-test-db",
  "woramet-store-test-auth",
  "woramet-store-test-rest",
  "woramet-store-test-storage",
]) {
  const r = spawnSync("docker", ["inspect", name], { stdio: "ignore" });
  if (r.status === 0)
    throw Error(
      `Test container ${name} already exists. Reuse it or remove only this disposable test stack before starting again.`,
    );
}
spawnSync("docker", ["network", "create", "woramet-store-tests"], {
  stdio: "ignore",
});
run([
  "run",
  "-d",
  "--name",
  "woramet-store-test-db",
  "--network",
  "woramet-store-tests",
  "-e",
  "POSTGRES_PASSWORD=local-test-only",
  "-p",
  "127.0.0.1:55432:5432",
  "postgres:17-alpine",
]);
async function waitFor(fn) {
  for (let i = 0; i < 120; i++) {
    try {
      if (await fn()) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  throw Error("Local test service did not become ready");
}
await waitFor(
  () =>
    spawnSync(
      "docker",
      [
        "exec",
        "woramet-store-test-db",
        "pg_isready",
        "-h",
        "127.0.0.1",
        "-U",
        "postgres",
      ],
      { stdio: "ignore" },
    ).status === 0,
);
run(
  [
    "exec",
    "-i",
    "woramet-store-test-db",
    "psql",
    "-U",
    "postgres",
    "-v",
    "ON_ERROR_STOP=1",
  ],
  readFileSync("tests/local/bootstrap.sql", "utf8") +
    (storageEnabled
      ? readFileSync("tests/local/storage-bootstrap.sql", "utf8")
      : "") +
    "\nalter role supabase_auth_admin set search_path=auth,public;\n",
);
const secret = randomBytes(40).toString("hex");
const jwt = (role) => {
  const h = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString(
    "base64url",
  );
  const b = Buffer.from(
    JSON.stringify({
      role,
      iss: "supabase",
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 86400,
    }),
  ).toString("base64url");
  return `${h}.${b}.${createHmac("sha256", secret).update(`${h}.${b}`).digest("base64url")}`;
};
const anonKey = jwt("anon");
const serviceKey = jwt("service_role");
writeFileSync(
  ".env.test",
  `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:55431\nNEXT_PUBLIC_SUPABASE_ANON_KEY=${anonKey}\nSUPABASE_SERVICE_ROLE_KEY=${serviceKey}\nAPP_URL=${appUrl}\nPAYMENT_MODE=sandbox\nPAYMENT_WEBHOOK_ENABLED=true\nPAYMENT_WEBHOOK_SECRET=${randomBytes(40).toString("hex")}\nPAYMENT_RECIPIENT_ID=local-sandbox-recipient\nTEST_DATABASE_URL=postgres://postgres:local-test-only@127.0.0.1:55432/postgres\nTEST_STORAGE_API=${storageEnabled}\n`,
);
writeFileSync(
  "tests/local/auth.env",
  `GOTRUE_JWT_SECRET=${secret}\nGOTRUE_DB_DRIVER=postgres\nGOTRUE_DB_DATABASE_URL=postgres://supabase_auth_admin:local-test-only@woramet-store-test-db:5432/postgres\nGOTRUE_API_HOST=0.0.0.0\nGOTRUE_API_PORT=9999\nAPI_EXTERNAL_URL=http://127.0.0.1:55431/auth/v1\nGOTRUE_SITE_URL=${appUrl}\nGOTRUE_JWT_AUD=authenticated\nGOTRUE_JWT_DEFAULT_GROUP_NAME=authenticated\nGOTRUE_JWT_ADMIN_ROLES=service_role\nGOTRUE_EXTERNAL_EMAIL_ENABLED=true\nGOTRUE_MAILER_AUTOCONFIRM=true\nGOTRUE_LOG_LEVEL=warn\n`,
);
writeFileSync(
  "tests/local/rest.env",
  `PGRST_DB_URI=postgres://authenticator:local-test-only@woramet-store-test-db:5432/postgres\nPGRST_DB_SCHEMAS=public\nPGRST_DB_ANON_ROLE=anon\nPGRST_JWT_SECRET=${secret}\nPGRST_SERVER_PORT=3001\n`,
);
run([
  "run",
  "-d",
  "--name",
  "woramet-store-test-auth",
  "--network",
  "woramet-store-tests",
  "--env-file",
  "tests/local/auth.env",
  "-p",
  "127.0.0.1:55499:9999",
  authImage,
]);
await waitFor(async () => {
  const r = await fetch("http://127.0.0.1:55499/health");
  return r.ok;
});
run(
  [
    "exec",
    "-i",
    "woramet-store-test-db",
    "psql",
    "-U",
    "postgres",
    "-v",
    "ON_ERROR_STOP=1",
  ],
  readFileSync("tests/local/platform.sql", "utf8") +
    (storageEnabled
      ? ""
      : readFileSync("tests/local/storage-fixture.sql", "utf8")),
);
run([
  "run",
  "-d",
  "--name",
  "woramet-store-test-rest",
  "--network",
  "woramet-store-tests",
  "--env-file",
  "tests/local/rest.env",
  "-p",
  "127.0.0.1:55430:3001",
  restImage,
]);
if (storageEnabled) {
  writeFileSync(
    "tests/local/storage.env",
    [
      `ANON_KEY=${anonKey}`,
      `SERVICE_KEY=${serviceKey}`,
      `AUTH_JWT_SECRET=${secret}`,
      "DATABASE_URL=postgres://supabase_storage_admin:local-test-only@woramet-store-test-db:5432/postgres",
      "POSTGREST_URL=http://woramet-store-test-rest:3001",
      "STORAGE_PUBLIC_URL=http://127.0.0.1:55431",
      "REQUEST_ALLOW_X_FORWARDED_PATH=true",
      "FILE_SIZE_LIMIT=8388608",
      "STORAGE_BACKEND=file",
      "GLOBAL_S3_BUCKET=local-test-storage",
      "FILE_STORAGE_BACKEND_PATH=/var/lib/storage",
      "TENANT_ID=local-test-only",
      "REGION=local",
      "ENABLE_IMAGE_TRANSFORMATION=false",
      "LOG_LEVEL=error",
      `S3_PROTOCOL_ACCESS_KEY_ID=local-test-only`,
      `S3_PROTOCOL_ACCESS_KEY_SECRET=${randomBytes(32).toString("hex")}`,
      "",
    ].join("\n"),
  );
  run([
    "run",
    "-d",
    "--name",
    "woramet-store-test-storage",
    "--network",
    "woramet-store-tests",
    "--env-file",
    "tests/local/storage.env",
    "--tmpfs",
    "/var/lib/storage:rw,size=67108864,mode=1777",
    "-p",
    "127.0.0.1:55500:5000",
    storageImage,
  ]);
  await waitFor(async () => (await fetch("http://127.0.0.1:55500/status")).ok);
}
process.stdout.write(
  `Disposable PostgreSQL + GoTrue + PostgREST ready; Storage API ${storageEnabled ? "v1.98.6 running" : "not included (schema fixture only)"}. Secrets saved only in ignored files. Start node tests/local/gateway.mjs, then npm run test:integration.\n`,
);
