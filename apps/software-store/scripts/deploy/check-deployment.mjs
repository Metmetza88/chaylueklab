import { readFile, appendFile } from "node:fs/promises";
import {
  validateDeploymentUrl,
  validateDeployment,
  vercelApi,
} from "./vercel-guard.mjs";
const source =
  process.env.STORE_DEPLOYMENT_URL ??
  (await readFile(process.env.STORE_DEPLOYMENT_URL_FILE, "utf8")).trim();
const url = validateDeploymentUrl(source);
const deployment = await vercelApi(
  `/v13/deployments/${encodeURIComponent(new URL(url).hostname)}`,
);
validateDeployment(deployment, {
  projectId: process.env.VERCEL_PROJECT_ID,
  commit: process.env.GITHUB_SHA,
  target: process.env.STORE_VERCEL_TARGET,
});
if (process.env.GITHUB_OUTPUT)
  await appendFile(
    process.env.GITHUB_OUTPUT,
    `url=${url}\ndeployment_id=${deployment.id}\n`,
  );
if (process.env.GITHUB_STEP_SUMMARY)
  await appendFile(
    process.env.GITHUB_STEP_SUMMARY,
    `Deployment READY: ${url}\n\nCommit: ${process.env.GITHUB_SHA}\n\nPayments disabled. Domains have not been assigned by staging.\n`,
  );
process.stdout.write(
  "Deployment project, source commit and readiness verified.\n",
);
