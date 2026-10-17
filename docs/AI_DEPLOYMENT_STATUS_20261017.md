# CHAYLUEKLAB AI deployment — 17 October 2026

## Verified changes on existing infrastructure

- Existing GitHub repository only: `Metmetza88/chaylueklab`; code changes are in PR #37 / `preview/vercel-connection-check-20261017`.
- Existing Supabase project: `yobymeygbfiwlngmwjcn`, healthy.
- Supabase migrations **applied successfully**:
  - `chaylueklab_ai_chat_daily_quota` → private RLS-enabled table `ai_chat_daily_usage`, privileged quota RPC.
  - `chaylueklab_ai_image_daily_quota` → private RLS-enabled table `ai_image_daily_usage`, privileged quota RPC.
- Supabase Edge Functions **deployed and ACTIVE (version 1)**:
  - `https://yobymeygbfiwlngmwjcn.supabase.co/functions/v1/ai-chat`
  - `https://yobymeygbfiwlngmwjcn.supabase.co/functions/v1/ai-image`
- AI Image Storage migration `chaylueklab_private_ai_image_bucket` applied successfully: private `chaylueklab-ai-images` bucket, PNG-only, 12 MiB maximum file size.
- AI Image Edge Function **updated to ACTIVE v2**: stores images server-side in the private bucket and returns 1-hour signed URLs (not inline base64 responses), keeping at most 10 recent images per user when further image generation occurs.
- Final GitHub Quality checks, Control Center CI and CodeQL: **all successful** for the image storage update.
- No existing video credit ledger, billing subscription table or current website production files were altered by these deployments.
- Both new endpoints validate LINE access/ID tokens server-side and require their own atomic per-user daily quota. The functions use `verify_jwt=false` at the gateway **because they independently validate LINE tokens** rather than accepting Supabase JWTs.
- Both endpoints have a *fail-closed provider switch*: provider requests require `CHAYLUEKLAB_AI_ENABLED=true` and `OPENAI_API_KEY` in **Supabase Edge Function secrets**. Until configured, they return an error instead of charging the OpenAI API.

## Still blocked: do not claim site is live

1. **Vercel access**: connected ChatGPT Vercel accounts get HTTP 403 `forbidden` for project `prj_zz7DosOYL0IZ4XYN7INZm3vwpzla` under team `waramatw2546-4532`. The production deployment originated from Vercel Drop, while GitHub `main` has another homepage; merging PR #37 to main without reconciling the Vercel Drop homepage might overwrite the live website.
2. **LINE Login**: existing `newsroomConfig.liffEndpointUrl` is `https://metmetza88.github.io/chaylueklab/`. A Vercel preview or `chaylueklab.com` is not within that registered endpoint. The preview branch prevents automatic `liff.login` from a foreign origin, but a successful production LINE Login requires confirming the correct LIFF Endpoint in LINE Developers.
3. **Provider secret and budget**: must add `OPENAI_API_KEY` to the intended Supabase project, and explicitly set `CHAYLUEKLAB_AI_ENABLED=true` *after* a verified LINE Login and spending review. An ordinary ChatGPT subscription does not supply a server API key.
4. **End-to-end testing**: must verify authenticated chat and image calls, video generation and billing flows using test users and providers before promoting to production.

## Release strategy

Keep `chaylueklab.com` in its existing state until the original Vercel Drop homepage is backed up and the Vercel project is accessible to the person doing the production deployment. Deploy the compatible GitHub build, then check the homepage, business services, LINE Login, AI Chat, AI Image, AI Video, membership and rollback.

## Status wording

**Supabase backend installed safely, AI providers intentionally disabled, Vercel preview builds pass, production website unchanged, end-to-end launch incomplete.**
