# WORAMET AI LAB — Cloud AI Security Review (22 November 2026)

Status: **REVIEW REQUIRED — DO NOT DEPLOY / ENABLE BILLING**.
Scope: `api/woramet-ai-chat.js` and `woramet-ai-cloud.html` on `feature/woramet-dojo-mvp-20261113`. Read-only inspection plus deterministic Business Insights checks; no live Groq calls.

## New work identified
- Commit `612bc4faffbc74c98d3e9ca295c08d6ea83e0125`: adds Groq-backed chat endpoint.
- Commit `ef7cf3b8e781e9a11bc7afaa771bbd8e2281a72d`: adds cloud chat UI.
- These are separate from `server/woramet/ai-boundary.mjs`, which remains disabled by default.

## Security blockers before any deployment
1. **No durable quota / spend cap:** `api/woramet-ai-chat.js` authenticates a shared bearer token but has no per-user rate limit, global usage cap or atomic quota reservation. A leaked token can consume paid model capacity. This endpoint does **not** use the safeguards in `ai-boundary.mjs`.
2. **Shared secret pasted into browser:** `woramet-ai-cloud.html` asks for `AI_OS_ACCESS_TOKEN`. It stays in page memory, but could be exposed to malicious scripts, browser extensions, or a compromised origin. Treat it as a secret, not a public login system.
3. **Request size and abuse limits:** message content has a logical limit after parsing, but there is no explicit early HTTP body-byte limit at the handler. Configure an infrastructure limit as well.
4. **No server-side durable identity:** a single shared token cannot identify individual users or reliably revoke one user. Add real authentication and scoped permissions if opening beyond personal testing.
5. **Provider error and data handling:** prompts and conversation history are sent to a third-party AI provider. Confirm user consent, retention policy, privacy notice, and approved budget before enabling.
6. **UI title is not evidence:** "Cloud AI • iPhone Ready • Private Access" is a label. Neither Safari hardware testing nor live provider success was verified in this review.

## Suggested safe sequence
- Keep the API unconfigured / unavailable and do not deploy the new endpoint.
- Decide whether cloud chat is in scope for the Dojo submission. If not, exclude it.
- If approved later: use real authentication, durable atomic quota and budget limits, strict request size limit, logging without secrets or raw prompts, abuse monitoring, and tests that mock provider responses.
- Test with synthetic prompts, never customer files or personal data.
- Obtain explicit owner approval before deployment, provider key setup, or any billable call.

## Business Insights smoke checks (in-memory evaluation, not Node test suite)
Eight isolated logic cases passed on 22 Nov 2026: sample THB 7,200 / 12 units, exact 0.10 + 0.20 satang arithmetic, Thai Buddhist date, invalid hour 24:00, missing price rejection, malformed thousands rejection, customer column omission, and zero-price sale. These do not establish Safari, full Node suite, Chromium, or end-to-end deployment success.

## Dojo facts checked
Dojo account: registered. Event 20 Nov 2026 22:00 to 23 Nov 2026 12:59 Asia/Bangkok. Prize pool USD 1,000. Rules on pre-existing code and model requirements remain unconfirmed in the available Dojo description. Do not submit or publish to Marketplace without owner's review and organizer clarification.
