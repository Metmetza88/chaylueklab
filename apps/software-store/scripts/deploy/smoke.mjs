import assert from "node:assert/strict";
import { validateDeploymentUrl } from "./vercel-guard.mjs";
const origin = validateDeploymentUrl(process.env.STORE_DEPLOYMENT_URL);
const headers = process.env.VERCEL_AUTOMATION_BYPASS_SECRET
  ? {
      "x-vercel-protection-bypass": process.env.VERCEL_AUTOMATION_BYPASS_SECRET,
    }
  : {};
const routes = [
  "/",
  "/products",
  "/categories",
  "/demo",
  "/demo/met-admission",
  "/demo/met-school-pro",
  "/cart",
  "/checkout",
  "/login",
  "/register",
  "/membership",
  "/support",
  "/contact",
  "/guide",
  "/privacy",
  "/terms",
];
for (const path of routes) {
  const r = await fetch(origin + path, {
    headers,
    redirect: "manual",
    signal: AbortSignal.timeout(20000),
  });
  assert.equal(
    r.status,
    200,
    `Preview ${path} returned HTTP ${r.status}; check deployment protection and runtime logs`,
  );
}
const health = await fetch(origin + "/api/health", {
  headers,
  signal: AbortSignal.timeout(20000),
});
assert.equal(health.status, 200);
const body = await health.json();
assert.equal(body.service, "chaylueklab-software-store");
assert.equal(body.payment_mode, "disabled");
for (const [path, method, expected] of [
  ["/api/download/11111111-1111-4111-8111-000000000001", "GET", 401],
  ["/api/payments/webhook", "POST", 503],
]) {
  const r = await fetch(origin + path, {
    method,
    headers,
    redirect: "manual",
    signal: AbortSignal.timeout(20000),
  });
  assert.equal(
    r.status,
    expected,
    `Safety gate ${path} returned HTTP ${r.status}`,
  );
}
process.stdout.write(
  "16 public routes, health, unauthorized download and closed payment webhook PASS.\n",
);
