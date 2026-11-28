import { expect, it } from "vitest";
import {
  validateProject,
  validateDeploymentUrl,
  validateDeployment,
  validatePaymentEnvironment,
} from "../scripts/deploy/vercel-guard.mjs";
const expected = { teamId: "team_store", projectId: "prj_store" };
const project = {
  id: "prj_store",
  accountId: "team_store",
  rootDirectory: "apps/software-store",
  link: { type: "github", org: "Metmetza88", repo: "chaylueklab" },
};
it("accepts only the isolated store project and domains", () =>
  expect(
    validateProject(
      project,
      [{ name: "store.chaylueklab.com" }, { name: "store-preview.vercel.app" }],
      expected,
    ),
  ).toEqual({ projectId: "prj_store", teamId: "team_store" }));
it.each([
  { ...project, accountId: "other" },
  { ...project, id: "other" },
  { ...project, rootDirectory: "." },
  { ...project, link: { ...project.link, repo: "other" } },
])("rejects wrong account, project, root or Git connection", (p) =>
  expect(() => validateProject(p, [], expected)).toThrow(),
);
it("blocks a project that also serves the main website", () =>
  expect(() =>
    validateProject(project, [{ name: "chaylueklab.com" }], expected),
  ).toThrow());
it.each([
  "PAYMENT_MODE=live",
  "PAYMENT_MODE=sandbox",
  "LIVE_PAYMENTS_APPROVED=true",
  "PAYMENT_WEBHOOK_ENABLED=true",
])("blocks candidate deployment with active payments", (env) =>
  expect(() => validatePaymentEnvironment(env)).toThrow(),
);
it("permits explicitly closed payment settings", () =>
  expect(() =>
    validatePaymentEnvironment(
      "PAYMENT_MODE=disabled\nLIVE_PAYMENTS_APPROVED=false\nPAYMENT_WEBHOOK_ENABLED=false",
    ),
  ).not.toThrow());
it.each([
  "https://store.vercel.app.evil.test",
  "https://store.vercel.app/?token=value",
  "https://user:password@store.vercel.app",
  "http://store.vercel.app",
  "https://chaylueklab.com",
])("rejects untrusted deployment URLs", (u) =>
  expect(() => validateDeploymentUrl(u)).toThrow(),
);
it("requires the exact project, commit and production build before promotion", () => {
  const d = {
    id: "dpl_test",
    projectId: "prj_store",
    meta: { sourceCommit: "abc" },
    readyState: "READY",
    target: "production",
    url: "store-test.vercel.app",
  };
  expect(
    validateDeployment(d, {
      projectId: "prj_store",
      commit: "abc",
      target: "production",
    }),
  ).toBe("https://store-test.vercel.app");
  for (const patch of [
    { projectId: "other" },
    { meta: { sourceCommit: "other" } },
    { readyState: "BUILDING" },
    { target: "preview" },
  ])
    expect(() =>
      validateDeployment(
        { ...d, ...patch },
        { projectId: "prj_store", commit: "abc", target: "production" },
      ),
    ).toThrow();
});

import { validateEnvironmentPolicy } from "../scripts/deploy/actions-policy.mjs";
const policy = {
  protection_rules: [
    {
      type: "required_reviewers",
      reviewers: [{ type: "User", reviewer: { id: 128637327 } }],
    },
  ],
  deployment_branch_policy: { custom_branch_policies: true },
};
it("requires a real owner-reviewed environment with exact branches", () => {
  expect(() =>
    validateEnvironmentPolicy(
      policy,
      { branch_policies: [{ name: "main", type: "branch" }] },
      "store-production",
    ),
  ).not.toThrow();
  expect(() =>
    validateEnvironmentPolicy(
      { ...policy, protection_rules: [] },
      { branch_policies: [{ name: "main", type: "branch" }] },
      "store-production",
    ),
  ).toThrow();
  expect(() =>
    validateEnvironmentPolicy(
      policy,
      {
        branch_policies: [
          { name: "main", type: "branch" },
          { name: "*", type: "branch" },
        ],
      },
      "store-production",
    ),
  ).toThrow();
});

it.each([
  [
    { type: "User", reviewer: { id: 128637327 } },
    { type: "User", reviewer: { id: 42 } },
  ],
  [{ type: "Team", reviewer: { id: 128637327 } }],
])("rejects policies that could be approved without the owner", (reviewers) => {
  expect(() =>
    validateEnvironmentPolicy(
      {
        ...policy,
        protection_rules: [{ type: "required_reviewers", reviewers }],
      },
      { branch_policies: [{ name: "main", type: "branch" }] },
      "store-production",
    ),
  ).toThrow();
});
it("rejects tags even when the tag is named main", () => {
  expect(() =>
    validateEnvironmentPolicy(
      policy,
      { branch_policies: [{ name: "main", type: "tag" }] },
      "store-production",
    ),
  ).toThrow();
});
it("fails closed when some branch policies have not been reviewed", () => {
  expect(() =>
    validateEnvironmentPolicy(
      policy,
      { total_count: 2, branch_policies: [{ name: "main", type: "branch" }] },
      "store-production",
    ),
  ).toThrow();
});
