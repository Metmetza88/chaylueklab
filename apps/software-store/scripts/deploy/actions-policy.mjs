export function validateEnvironmentPolicy(env, policies, name) {
  const reviewers =
    env.protection_rules?.find((r) => r.type === "required_reviewers")
      ?.reviewers ?? [];
  if (
    reviewers.length !== 1 ||
    reviewers[0].type !== "User" ||
    reviewers[0].reviewer?.id !== 128637327
  )
    throw Error(`${name} must require the repository owner's approval`);
  if (!env.deployment_branch_policy?.custom_branch_policies)
    throw Error(`${name} must restrict deployment branches`);
  const allowed =
    name === "store-preview"
      ? ["main", "feature/woramet-school-store-20261124"]
      : ["main"];
  const branches = policies.branch_policies ?? [];
  if (branches.some((p) => p.type !== "branch"))
    throw Error(`${name} must permit branches only, without tag policies`);
  const names = branches.map((p) => p.name);
  if ((policies.total_count ?? names.length) > names.length)
    throw Error("Review every deployment branch policy");
  if (!names.includes("main") || names.some((n) => !allowed.includes(n)))
    throw Error(`${name} contains an unapproved branch policy`);
}
async function main() {
  const action =
    process.env.GITHUB_EVENT_NAME === "push"
      ? "stage-production"
      : process.env.STORE_REQUESTED_ACTION;
  if (
    !["verify", "preview", "stage-production", "promote-production"].includes(
      action,
    )
  )
    throw Error("Unknown deployment action");
  if (
    action !== "verify" &&
    action !== "preview" &&
    process.env.GITHUB_REF !== "refs/heads/main"
  )
    throw Error("Production deployments require main");
  const names =
    action === "verify"
      ? []
      : action === "preview"
        ? ["store-preview"]
        : action === "promote-production"
          ? ["store-production", "store-production-release"]
          : ["store-production"];
  const repo = process.env.GITHUB_REPOSITORY;
  if (repo !== "Metmetza88/chaylueklab" || !process.env.GITHUB_TOKEN)
    throw Error("Wrong repository or missing Actions read credential");
  async function get(path) {
    const response = await fetch(
      `https://api.github.com/repos/${repo}/${path}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
        signal: AbortSignal.timeout(20000),
      },
    );
    if (!response.ok)
      throw Error(
        `Cannot verify protected store environment (HTTP ${response.status})`,
      );
    return response.json();
  }
  for (const name of names) {
    const env = await get(`environments/${name}`);
    const policies = await get(
      `environments/${name}/deployment-branch-policies`,
    );
    validateEnvironmentPolicy(env, policies, name);
  }
  process.stdout.write(
    "Required store environment approval and branch policies verified.\n",
  );
}
if (process.argv[1]?.endsWith("/actions-policy.mjs")) await main();
