# CHAYLUEKLAB Control Center

Adds `control.html` to the existing static site, linked from its original home page. Existing AI Video, Life OS, membership, and newsroom pages remain in place. No new repository or hosting project is required.

## Operation

1. Open the existing site and select **CHAYLUEKLAB Control Center**.
2. Sign in with LINE. A verified owner can add products and enable staff accounts. Each SKU/size begins at zero; use **รับเข้า** to record actual inventory.
3. Staff who are not enabled see only their own LINE identifier, which they can copy for the owner. They cannot read inventory or reports.
4. Tap **ขายออก**, choose quantity, channel and price, then confirm. Online sales and store sales share the same stock. The ledger stores the actor, channel, actual unit price and optional order note.
5. Reports use Bangkok calendar days. Sales totals apply to the selected day; the history and CSV explicitly show the latest 50 transactions across all dates.

The page refreshes shared stock every 15 seconds while visible and on focus. After a successful transaction it updates immediately and refreshes from the server. A row lock prevents overselling; an actor-scoped request ID prevents repeat deductions. If a response is lost, the pending transaction is kept in session storage and retried with the same payload and ID, including after a reload. Tokens and secrets are never persisted by this module.

## Existing infrastructure

- Existing Supabase project: `yobymeygbfiwlngmwjcn`.
- Database setup: `setup-retail-control.sql` (applied to the existing project).
- Edge Function: `supabase/functions/retail-control/index.ts` (deployed to the same project).
- Shared LINE identity and owner validation: `_shared/membership.ts`.
- Required server configuration is reused: `SUPABASE_URL`, the existing Supabase service-role/secret environment setting, `LINE_CHANNEL_ID` or `LINE_LOGIN_CHANNEL_ID`, and `NEWSROOM_OWNER_LINE_ID` or `LINE_OWNER_USER_ID`. Alternatively, the existing `app_owner` record can define the owner. No additional API key is needed.
- Existing LIFF ID: `2011681452-k1lfYGsF`. Its configured endpoint must include the site's directory containing both `index.html` and `control.html`. Check LINE's LIFF endpoint/scopes on an actual signed-in phone before staff rollout; there is no fresh LIFF application.

Database tables and RPCs are not accessible to anonymous or authenticated Supabase clients. Every request verifies LINE credentials on the server, then checks owner or enabled staff access. Owners alone can create SKUs and manage staff. Stock and ledger changes commit atomically. The shared JSON response helper was corrected to send a bodyless 204 preflight response.

No sample store balances, sales, employees or products are seeded. No public frontend deployment is performed by this change. After review, merge the PR and publish through the existing deployment process only with the owner's authorization. `noindex` is not access control; server-side staff checks protect data, while the sign-in page and static assets can be reachable on the existing host.

## Verification

This repository is static HTML/CSS/JavaScript and has no application build command. Use:

```sh
node --check control.js
node --test tests/*.test.mjs
# With Playwright and Chromium installed (starts a local test server automatically):
node tests/retail-browser.mjs
```

The browser suite uses test-only LINE/API interception. It checks 320, 390, 412 and 1280px layouts, stock visibility, a LINE-channel sale, receiving stock, lost-response recovery after reload, reports and CSV export. These checks passed at all four widths with no horizontal overflow or page errors. It does not certify a real owner's LINE token or physical iPhone/Android LIFF behavior. The backend tests separately exercise real SQL transactions and private permissions on the existing Supabase project; test inventory is rolled back/removed. Live OPTIONS returns 204 and unauthenticated POST returns 401.

Verified live database behavior: sale 8 → 7, same-ID replay without another deduction, changed payload rejection, oversell rejection, receiving stock, and two concurrent sales of the last unit resulting in exactly one sale. All test rows were removed. The browser suite uses intercepted fixtures; a real owner/staff LINE sign-in still needs verification on the existing deployed site after approved publication.
