import { parseEnv } from "node:util";
export const STORE_ROOT = "apps/software-store";
export const STORE_REPO = "metmetza88/chaylueklab";
export function validateProject(project, domains, { teamId, projectId }) {
  if (
    !teamId ||
    !projectId ||
    project.id !== projectId ||
    project.accountId !== teamId
  )
    throw Error("Wrong Vercel team or project");
  if (project.rootDirectory !== STORE_ROOT)
    throw Error("Vercel Root Directory must be apps/software-store");
  const link = project.link;
  if (
    link?.type !== "github" ||
    `${link.org}/${link.repo}`.toLowerCase() !== STORE_REPO
  )
    throw Error("Vercel project must link to Metmetza88/chaylueklab");
  for (const d of domains) {
    const n = d.name.toLowerCase();
    if (n !== "store.chaylueklab.com" && !n.endsWith(".vercel.app"))
      throw Error("Project contains a domain outside the software store");
  }
  return { projectId: project.id, teamId: project.accountId };
}
export function validatePaymentEnvironment(text) {
  const env = parseEnv(text);
  if (
    (env.PAYMENT_MODE ?? "disabled") !== "disabled" ||
    env.LIVE_PAYMENTS_APPROVED === "true" ||
    env.PAYMENT_WEBHOOK_ENABLED === "true"
  )
    throw Error(
      "Release candidate deployment requires payments and payment webhook disabled",
    );
}
export function validateDeploymentUrl(value) {
  const u = new URL(value);
  if (
    u.protocol !== "https:" ||
    !u.hostname.endsWith(".vercel.app") ||
    u.username ||
    u.password ||
    u.search ||
    u.hash ||
    u.pathname !== "/"
  )
    throw Error("Unexpected Vercel deployment URL");
  return u.origin;
}
export function validateDeployment(deployment, { projectId, commit, target }) {
  if (
    deployment.projectId !== projectId ||
    deployment.meta?.sourceCommit !== commit ||
    deployment.readyState !== "READY"
  )
    throw Error("Deployment project, commit or readiness does not match");
  if (target === "production" && deployment.target !== "production")
    throw Error("Promotion requires a staged production deployment");
  return validateDeploymentUrl(`https://${deployment.url}`);
}
export async function vercelApi(path) {
  const token = process.env.VERCEL_TOKEN;
  const team = process.env.VERCEL_ORG_ID;
  if (!token || !team)
    throw Error(
      "Configure VERCEL_TOKEN and VERCEL_ORG_ID in the protected environment",
    );
  const url = new URL(path, "https://api.vercel.com");
  if (url.origin !== "https://api.vercel.com")
    throw Error("Unexpected API origin");
  url.searchParams.set("teamId", team);
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok)
    throw Error(
      `Vercel API denied the scoped request (HTTP ${response.status})`,
    );
  return response.json();
}
