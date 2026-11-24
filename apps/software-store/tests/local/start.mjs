// Starts only containers named woramet-store-test-*. Never uses hosted database credentials.
import { spawnSync } from "node:child_process";
import { writeFileSync, readFileSync } from "node:fs";
import { createHmac, randomBytes } from "node:crypto";
const run = (args, input) => {
  const r = spawnSync("docker", args, {
    input,
    encoding: "utf8",
    stdio: input ? ["pipe", "pipe", "pipe"] : ["ignore", "pipe", "pipe"],
  });
  if (r.status !== 0)
    throw Error(
      `Local test container command failed: ${args.slice(0, 3).join(" ")}. Inspect Docker locally.`,
    );
  return r.stdout;
};
for (const name of [
  "woramet-store-test-db",
  "woramet-store-test-auth",
  "woramet-store-test-rest",
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
  for (let i = 0; i < 60; i++) {
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
      ["exec", "woramet-store-test-db", "pg_isready", "-U", "postgres"],
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
writeFileSync(
  ".env.test",
  `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:55431\nNEXT_PUBLIC_SUPABASE_ANON_KEY=${jwt("anon")}\nSUPABASE_SERVICE_ROLE_KEY=${jwt("service_role")}\nAPP_URL=http://127.0.0.1:3000\nPAYMENT_MODE=sandbox\nPAYMENT_WEBHOOK_ENABLED=true\nPAYMENT_WEBHOOK_SECRET=${randomBytes(40).toString("hex")}\nPAYMENT_RECIPIENT_ID=local-sandbox-recipient\nTEST_DATABASE_URL=postgres://postgres:local-test-only@127.0.0.1:55432/postgres\n`,
);
writeFileSync(
  "tests/local/auth.env",
  `GOTRUE_JWT_SECRET=${secret}\nGOTRUE_DB_DRIVER=postgres\nGOTRUE_DB_DATABASE_URL=postgres://supabase_auth_admin:local-test-only@woramet-store-test-db:5432/postgres\nGOTRUE_API_HOST=0.0.0.0\nGOTRUE_API_PORT=9999\nAPI_EXTERNAL_URL=http://127.0.0.1:55431/auth/v1\nGOTRUE_SITE_URL=http://127.0.0.1:3000\nGOTRUE_JWT_AUD=authenticated\nGOTRUE_JWT_ADMIN_ROLES=service_role\nGOTRUE_EXTERNAL_EMAIL_ENABLED=true\nGOTRUE_MAILER_AUTOCONFIRM=true\nGOTRUE_LOG_LEVEL=warn\n`,
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
  "public.ecr.aws/supabase/gotrue:v2.198.0",
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
  readFileSync("tests/local/platform.sql", "utf8"),
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
  "public.ecr.aws/supabase/postgrest:v16.6",
]);
process.stdout.write(
  "Disposable PostgreSQL + GoTrue + PostgREST ready. Secrets saved only in ignored files. Start node tests/local/gateway.mjs, then npm run test:integration. Storage API is not part of this reduced stack.\n",
);
