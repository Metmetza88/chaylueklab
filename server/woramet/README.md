# WORAMET AI server boundary — disabled

This folder belongs to the existing repository and experimental branch. It is outside the static public app. It introduces no database, live provider, subscription or deploy configuration.

## What exists

- `dev-server.mjs`: a Node.js 24 loopback-only HTTP preview, with a static-file allowlist. Run `node server/woramet/dev-server.mjs` from the repository root. No keys, server source or customer files are served.
- `ai-boundary.mjs`: `createAIHandler()` and `buildAIRequest(report)`. These provide a framework-independent Request/Response contract for a future server adapter.
- `GET /api/business-insights/ai`: reports `generativeAI: false`, `mode: not-connected`.
- `POST /api/business-insights/ai`: returns HTTP 503 `ai_disabled` in the preview. There is no provider code in the runtime. Adding an API key or environment flag alone cannot activate it.
- The browser has `connect-src 'none'` and does not call this endpoint. No AI button imitates a successful generation.

## Future integration contract (not production-ready)

After owner approval, implementation requires all of:

1. A separately approved server provider adapter, using credentials from server secrets with a distinct WORAMET scope. Do not reuse LINE, billing, newsroom or video keys implicitly. No user-supplied provider URL, redirects to arbitrary hosts or client keys.
2. `enabled: true` passed in server code, verified `authenticate(request)` returning the permitted user's identifier, and `consumeQuota(identity)` atomically reserving a request under a durable per-user and total spending limit. In-memory mocks are for tests only. An environment boolean is insufficient.
3. `provider({summary, instruction, tools:false, signal})` returning exactly `{text, model}`. Honor cancellation. No tools, publishing or arithmetic authority. Output remains a human-reviewed draft; financial totals always come from deterministic code.
4. Owner consent to the exact minimized payload and provider retention terms, followed by a real synthetic-data end-to-end test. The current mocks are not this test.
5. A separately reviewed frontend change to the CSP and explicit AI consent/control, with stale-response cancellation and plain-text output. Leave local calculations and template drafts usable when AI fails.

`buildAIRequest` retains only currency, integer sales totals, units, row/product counts and at most five ranked products labeled `Product 1`–`Product 5`. It strips raw CSV, actual product names, dates and extra columns. Aggregate amounts can still be commercially sensitive, so minimization does not remove the need for approval/consent.

Request example (illustrative, not a live call):

```json
{
  "action": "draft-observations",
  "summary": {
    "currency": "THB",
    "revenueCents": 20000,
    "units": 2,
    "rowCount": 1,
    "productCount": 1,
    "topProducts": [{"label":"Product 1","units":2,"revenueCents":20000}]
  }
}
```

The enabled test boundary requires a same-origin POST with JSON, verified identity and quota. It validates exact fields and numeric consistency, bounds streaming bodies to 16 KB, times out the adapter at 10 seconds, bounds output to 4,000 characters and masks upstream errors. All responses disable caching. It does not supply a real authenticator, quota store, provider SDK or key management system; these must be implemented and reviewed before any public activation. Provider cancellation alone cannot guarantee cancellation of billing, so future quota/budget policy must handle ambiguous timeouts without blind retry.

## Existing AI code assessment

Read-only source inspection found:

| Existing code | Capability in source | Why it is not wired to Insights |
| --- | --- | --- |
| `supabase/functions/line-group-assistant/index.ts` | Server-side OpenAI text request using a brand-specific environment variable | Scoped to LINE group context/identity; live configuration not verified |
| `supabase/functions/newsroom/workforce.ts` | Validated drafts through a configured external worker | Editorial workflow, not sales analysis; worker availability not verified |
| `supabase/functions/image-create`, `video-create`, `_shared/video-provider.ts` | Gemini/Runway image/video generation adapters | Different task and potential paid credits; never invoked here |
| `ai-money-studio/app.js` | Five seller templates; remaining 15 tools marked upcoming | Local string templates, no model call |

No Supabase project settings, database, secrets or deployed functions were changed or queried. Code presence is not evidence of operational credentials or owner permission to spend. Do not label this MVP as a working Generative AI application until a real integration has been approved and tested.

## Tests

```sh
node --test ai-money-studio/tests/business-insights-ai.test.mjs
```

Tests inject only a fake adapter and identity/quota stubs, and run the local disabled HTTP preview. They verify the boundary without contacting paid services. The public artifact build was checked to exclude `server/`; the server files are never linked from the static app.
