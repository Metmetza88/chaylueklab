# CHAYLUEKLAB NEWSROOM workforce

`data/newsroom-workforce.js` adapts the 15 named roles and common approval policy from `Metmetza88/botpress/seed-bots.mjs`. It includes five editorial stages: reporter, factcheck, editor, social and image brief. The Windows/WPF/WebView2 application, Rakazo app bridge, schedulers and production tools are not imported or executed.

The server adapter in `supabase/functions/newsroom/workforce.ts` calls an existing trusted workforce backend only after the Newsroom API authenticates its owner. It returns a draft for review. It never changes a story, records a factcheck, approves, publishes, generates media or sends a LINE message. A factcheck's `recommendation: "verified"` is a recommendation only; the owner must inspect evidence and explicitly confirm the factcheck in the Newsroom workflow.

## Server configuration

Set these in the existing Supabase project's **Edge Functions → Secrets**:

- `NEWSROOM_WORKFORCE_URL`: the public HTTPS URL of an existing workforce gateway that implements the contract below. Do not use a Windows app endpoint, a local address or an arbitrary LLM API URL.
- `NEWSROOM_WORKFORCE_TOKEN`: the gateway's server authentication token. Obtain it from the administrator of that existing backend. Never commit it or put it in frontend configuration.

When either value is absent or the URL is unsafe, the API returns `503 workforce_not_configured`. There is no local simulation or fake generation. Defining the 15 roles is not proof that a connected workforce is running.

## Gateway contract

The adapter sends a JSON `POST` with server-only `Authorization: Bearer …` and `Idempotency-Key: <request UUID>`. The gateway should enforce this idempotency key to prevent duplicate provider charges. Requests include `workflow_version`, `stage`, roles, system instructions, disabled publication capabilities, `input_kind: "untrusted_editorial_data"` and the persisted story's editorial fields. The gateway must keep these instructions separate from untrusted story/source content, use only authorized research capabilities, and report inability to verify facts rather than inventing evidence.

Return `Content-Type: application/json` and this envelope:

```json
{
  "stage": "editor",
  "draft": { "title": "…", "summary": "…", "body": "…" },
  "provider_request_id": "optional-provider-job-id"
}
```

Allowed draft fields:

| Stage | Required draft | Optional draft |
| --- | --- | --- |
| `reporter` | `title`, `summary`, `body`, `sources` (1–10 HTTPS URLs, or `{url,label}` objects) | — |
| `factcheck` | `recommendation` (`verified` or `needs_revision`), `note`, `evidence` (1–20 `{claim,source_url,note}` objects) | — |
| `editor` | `title`, `summary`, `body` | — |
| `social` | `social_copy` | `line_copy` |
| `image_brief` | `image_brief` | `video_brief` |

Unknown envelope/draft fields, approval/publication commands, unsafe URLs, oversized responses and incorrect stages are rejected. Requests have a 20-second timeout, forbid redirects and cap the response at 100 KB. Upstream error text and credentials are not returned to the browser.

## Validation

`node --test tests/newsroom-workforce.test.mjs` checks role count, missing credentials, endpoint safety, request idempotency, untrusted input separation, provider injection, factcheck recommendations and upstream failures. `deno check supabase/functions/newsroom/workforce.ts` checks the deployable adapter. These checks verify the integration boundary; testing real workforce output requires the gateway URL and its valid server token.
