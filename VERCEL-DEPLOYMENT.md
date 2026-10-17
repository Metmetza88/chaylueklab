# Deploy the existing site on Vercel

Use the existing `Metmetza88/chaylueklab` repository and existing Vercel project.
Set the project Root Directory to the repository root and use Node.js 24.x.
`vercel.json` runs the unit tests before building and publishes only `_site`.
It does not deploy the backend functions or database migrations.

## Verify a preview

The artifact includes all four previously omitted linked sections and a release
manifest using `VERCEL_GIT_COMMIT_SHA` (or `GITHUB_SHA` for GitHub Pages).
Run `node --test tests/*.test.mjs` and `node scripts/build-public-site.mjs` locally.
After deployment, run `scripts/verify-deployed-site.mjs` with `SITE_URL` set to the
deployment base URL and `EXPECTED_RELEASE_SHA` set to the deployed commit SHA.
Protected previews require authorized access; a login response is not a passing route check.

## LINE login remains on its configured canonical endpoint

The shared LINE LIFF endpoint is currently
`https://metmetza88.github.io/chaylueklab/` in `data/newsroom-config.js`.
Stock and Newsroom intentionally route login through this existing endpoint.
A Vercel preview therefore does not establish that LINE login runs on Vercel.
Do not remove the origin checks or guess a new callback URL.

To migrate login to `https://chaylueklab.com/`, first verify that the domain serves
this same application in the intended Vercel project. Then update the existing
LIFF endpoint in LINE Developers and `liffEndpointUrl` together, and test the
actual login on the canonical domain. Preview hostnames should continue to route
to that canonical endpoint. No LINE console settings are changed by this patch.

## Production release

Require the existing quality/security checks for the exact release commit.
The unit tests in the Vercel build do not replace the existing CodeQL workflow.
Verify the production branch, domain assignment and deployment checks in Vercel;
the GitHub Pages workflow only gates GitHub Pages. Keep a known working release
available before changing domain routing. Publish only after preview review.
