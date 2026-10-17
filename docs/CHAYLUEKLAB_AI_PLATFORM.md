# CHAYLUEKLAB AI Platform — implementation blueprint

Status: development branch only; not deployed. Preserve existing LINE LIFF, Stripe membership (59 THB/month), Supabase billing functions and LINE OA separation.

## Modules
1. Prompt Gallery: curated image/video prompts, category, tags, search, aspect ratio, example preview, prompt detail and copy.
2. AI Chat: server-side provider adapters, authenticated requests, per-user rate limits and conversation history.
3. AI Image and Video: asynchronous jobs, status polling, owned assets and credit ledger; do not expose provider API keys.
4. LINE LIFF: validate LINE ID token on server; no client-provided LINE user IDs trusted.
5. Membership: reuse existing Stripe billing and verified webhook, avoid duplicate subscriptions.
6. Admin: role-based access for prompt moderation, job costs, usage and audit log.
7. Documentation: searchable tutorials and model-specific examples.

## Proposed data entities
ai_prompts(id,slug,title,kind,category,tags,prompt_text,preview_url,aspect_ratio,is_published,created_at)
ai_jobs(id,user_id,kind,provider,status,input_json,output_url,cost_credits,created_at)
ai_credit_ledger(id,user_id,job_id,delta,reason,created_at)
ai_conversations(id,user_id,title,created_at)
ai_messages(id,conversation_id,role,content,created_at)
ai_usage_limits(user_id,window_start,requests_used)

## Security and release gates
- Enable Supabase row-level security; users can only read their own jobs, messages and ledger.
- Verify LINE identity server-side; validate Stripe webhook signatures and idempotency.
- Use separate CHAYLUEKLAB and P.Somneuk LINE OA credentials; no cross-channel fallback.
- Restrict admin actions to explicit server-side roles.
- Keep all AI keys and billing secrets in deployment environment, never in frontend.
- Require test suite, preview review, cost caps and explicit owner approval before production deployment.
- Check existing code before migrations or modifying billing endpoints.

## Suggested phased implementation
Phase 1: existing architecture audit, gallery schema and gallery UI.
Phase 2: AI chat and authenticated job processing.
Phase 3: image/video jobs, credit ledger and storage.
Phase 4: admin controls, tutorials, usage analytics and end-to-end testing.

## Deployment blocker
The supplied Vercel project ID was not found in either linked Vercel account and both personal project lists were empty. Identify correct team/project and validate domain linkage before deploying.
