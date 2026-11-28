import { mkdir, writeFile, readFile } from "node:fs/promises";
import {
  validateProject,
  validatePaymentEnvironment,
  vercelApi,
} from "./vercel-guard.mjs";
const id = process.env.VERCEL_PROJECT_ID;
if (!id || !process.env.VERCEL_ORG_ID)
  throw Error(
    "Set VERCEL_PROJECT_ID and VERCEL_ORG_ID for the isolated store project",
  );
const project = await vercelApi(`/v9/projects/${encodeURIComponent(id)}`);
const result = await vercelApi(
  `/v9/projects/${encodeURIComponent(id)}/domains?limit=100`,
);
if (result.pagination?.next != null)
  throw Error("Review every project domain before allowing deployment");
validateProject(project, result.domains ?? [], {
  teamId: process.env.VERCEL_ORG_ID,
  projectId: id,
});
if (process.argv[2] === "check-env") {
  const target =
    process.env.STORE_VERCEL_TARGET === "production" ? "production" : "preview";
  validatePaymentEnvironment(
    await readFile(`.vercel/.env.${target}.local`, "utf8"),
  );
} else {
  await mkdir(".vercel", { recursive: true });
  await writeFile(
    ".vercel/project.json",
    JSON.stringify({
      projectId: id,
      orgId: process.env.VERCEL_ORG_ID,
      projectName: project.name,
    }),
  );
}
process.stdout.write(
  "Verified isolated store team, project, GitHub repository and domain scope.\n",
);
