# CHAYLUEKLAB NEWSROOM

This module stays in `Metmetza88/chaylueklab`. It reuses editorial status transitions and the 15 BotPress roles/prompts from `Metmetza88/botpress`; no Windows, WPF, WebView2, Rakazo host or new membership system is included. Existing Life OS and payment files remain intact.

## Current status

The existing Supabase project is **`yobymeygbfiwlngmwjcn`**. After the owner ran `newsroom-install.sql`, the connected Supabase plugin verified the three Newsroom tables, revision fields, RLS and service-only RPC permissions. The deployed `newsroom` function is active at **version 4**, with the correct owner-supplied LIFF audience configured in server-bundled public source. Live verification: public GET returns HTTP 200 with an empty article list; OPTIONS returns 204. Owner POST with no ID token or an invalid test token returns `403 owner_identity_required` after the owner added configuration. The function is installed, but real owner login, AI workforce and website deployment are not yet complete. No news has been published. The current Node test suite passes 24 tests; Deno type checking passes.

The Supabase plugin now provides management access; a separate access token is not required for plugin deployment. A management token is needed only when using the optional CLI deployment script below. A history index was added and verified live after the performance advisor check.

Release review uses `fix/control-center-plus59` in `Metmetza88/chaylueklab`. The owner saved an exact review-branch exclusion in ruleset M, resolving branch creation. The remote source tree must match the reviewed local tree. The last saved ruleset still targets main but omits its original creation/update/deletion and code-coverage restrictions; restore those four rules before merge. Managed App connections cannot administer rulesets, and this release did not edit them. PR #1 was closed without merge; its source is included in this review. The frontend awaits owner review and publication. See `CONTROL-CENTER.md`.

## Routes and workflow

- `/newsroom.html`, `/news/`: published verified owner-approved news only, with full text, category, references, date, media and a user-triggered LINE share link.
- `/newsroom-owner.html`: existing LINE identity, draft creation/editing, assignment, factcheck evidence, editorial transitions, explicit approval and a separate explicit publish action.
- AI Studio handoff points to the **existing `/ai-video.html`** in the current main branch. Briefs are copied for owner review; Newsroom does not claim to generate media.

`pitched → assigned → drafting → factcheck → editing → ready → owner approval → explicit publish`

Only the server-verified owner may change articles or request AI drafts. A service-only PostgreSQL RPC locks the row, checks its revision and stores changes/history together. Facts/body/source changes invalidate prior factchecks. Every edit invalidates approval. Ready articles are locked; send them back to editing first. Repeated create requests return the existing article, and changed retry payloads are rejected. Concurrent stale requests fail with a revision conflict.

## Deploy into the existing Supabase project

The connected Supabase plugin can deploy this function without requesting another key. For the optional CLI script only, use an execution environment secret called **`SUPABASE_ACCESS_TOKEN`**, generated at https://supabase.com/dashboard/account/tokens. Do not paste it into source, browser configuration or chat. The existing project's runtime supplies `SUPABASE_URL` and its admin key; no key is embedded in these files.

The owner supplied the existing LIFF **`2011681452-yexLrODy`**; it is now configured in `data/newsroom-config.js`. Its LINE Login audience is **`2011681452`**, derived from this trusted bundled public configuration on the server. **No additional secret is required for this public channel ID.** The already configured `NEWSROOM_OWNER_LINE_ID` and LINE's verified token subject still determine owner access. An optional `LINE_LOGIN_CHANNEL_ID` override must match the bundled app; malformed or mismatched overrides fail closed. Newsroom does not use another integration's `LINE_CHANNEL_ID` as its production audience. No browser-supplied channel, decoded token claim or owner ID can override verification. Actual API credentials remain exclusively in server environment variables.

Public LIFF metadata currently names the app “Chaylueklab Snooze” and registers `https://metmetza88.github.io/chaylueklab/` as its endpoint. Owner login works only under the registered endpoint or a descendant; `/newsroom-owner.html` must first be deployed there through the existing hosting workflow. A page on `chaylueklab.com` does not automatically belong to that endpoint: its login button now opens the same existing LIFF with the owner-page path rather than requesting an invalid callback on another origin. The public LINE CTA likewise carries the newsroom-page path. Confirm the existing app's `openid` scope in LINE Developers before a live owner login test. No LINE endpoint, Life OS LIFF app, production domain or account has been changed. LIFF SDK initialization runs on each owner-page load under the registered endpoint and resumes a signed-in callback without another login click.

```sh
node scripts/deploy-newsroom.mjs --check
node scripts/deploy-newsroom.mjs --deploy
```

The script verifies target project identity, applies **only** Newsroom migrations `004`, `005`, `006` with migration history tracking, sets owner/channel server variables, and deploys only `newsroom` using a pinned Supabase CLI. It never deploys Life OS, billing or video functions. It then verifies the public API response. Existing migrations/records are not replaced. Optional workforce credentials in the execution environment are added only when both values exist.

Static pages must be deployed through the existing website hosting workflow after code review. Confirm owner LINE Login, draft→factcheck→approve→publish, and public reading there. An API check alone does not establish a working website/login.

## Real AI integration boundary

See `NEWSROOM_WORKFORCE.md`. `NEWSROOM_WORKFORCE_URL` and `NEWSROOM_WORKFORCE_TOKEN` must identify a real server-side workforce gateway. Missing credentials return `503 workforce_not_configured`, with no fake news/generation. All provider output is an inert proposal. Factcheck recommendations do not mark stories verified; approval/publication require separate owner actions. There is no automatic LINE/social broadcast. The existing video Studio separately needs its own real generation credentials described in `AI-VIDEO-SETUP.md`.

## Tests

```sh
node --test tests/newsroom*.test.mjs
NEWSROOM_PGLITE_MODULE=/path/to/@electric-sql/pglite/dist/index.js node scripts/verify-newsroom-sql.mjs
NEWSROOM_PLAYWRIGHT_MODULE=/path/to/playwright-core/index.mjs node scripts/verify-newsroom-browser.mjs
```

The SQL test applies real PostgreSQL migrations and checks the whole workflow, idempotency, version conflicts, rollback, RLS and RPC permissions. Browser tests use explicitly labeled fixtures for rendering/controls/mobile layout; they do not claim to verify live LINE login or providers. No dependency is added to the website merely to run these checks.
