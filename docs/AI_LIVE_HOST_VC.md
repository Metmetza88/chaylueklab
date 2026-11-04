# CHAYLUEKLAB AI LIVE HOST — Version C (implementation plan)

Status: design only; no YouTube OAuth, avatar, encoder, or live broadcast connected.

## Architecture
YouTube liveChatMessages.streamList -> dedicated worker -> moderation and deduplication -> AI response engine -> Thai TTS -> real-time avatar (LiveAvatar Lite or equivalent) -> compositor (OBS/FFmpeg/GStreamer on persistent host) -> RTMP ingest -> YouTube.

Admin control UI can live in the existing CHAYLUEKLAB website on Vercel. Persistent WebSocket chat listeners, avatar sessions, compositing and RTMP streaming must run on a persistent worker/server, not on Vercel serverless functions.

## Critical design requirements
- Reuse the existing repository and YouTube channel. Do not alter LIFF, Stripe, payments, shop, or existing broadcast.
- Never store YouTube OAuth refresh tokens, stream keys, or provider API keys in the browser, repo, or client logs.
- Start in **dry-run** mode: read chat, draft replies, preview speech; require operator approval before public output.
- Queue messages with deduplication by YouTube message ID, per-user cooldown, maximum reply rate, and no auto-replies to bot's own posts.
- Validate product details against a verified catalog; unknown price, size, stock or order status -> ask customer to use verified checkout link.
- Moderation for spam, private information, harassment, and prompt injection. Kill switch, pause, mute, and per-session budget cap.
- Show “AI host” disclosure in broadcast. Ensure all MV/audio/likeness rights.
- Persist job states, health checks, reconnection with nextPageToken, metrics, and alerts.
- Avatar sessions are limited in duration by provider plan; reconnect/recreate sessions and show fallback static scene during downtime.
- Existing Upstream pre-recorded stream must not be assumed to support arbitrary live audio/video overlays. Verify ingest and switching capabilities before touching live event.
- Do not transmit the same stream to YouTube from two simultaneous encoders using the same key.

## Staged acceptance
1. Read YouTube chat via OAuth in a private/unlisted test live; show sanitized messages in dashboard.
2. AI drafts responses; operator can approve, reject, edit.
3. Generate Thai speech; preview audio without broadcasting.
4. Test live lip-sync avatar with approved input in a private preview.
5. Mix avatar, MV and audio with fallback scene; inspect sync and latency.
6. Send to a separate private/unlisted test YouTube event with explicit operator approval.
7. Only then migrate to public event, preserving ability to revert.

## Configuration placeholders
YOUTUBE_OAUTH_CLIENT_ID, YOUTUBE_OAUTH_CLIENT_SECRET, YOUTUBE_OAUTH_REFRESH_TOKEN, AI_API_KEY, TTS_API_KEY, AVATAR_API_KEY, DATABASE_URL, STREAM_RTMP_URL, STREAM_KEY (server-only), ADMIN_AUTH_SECRET.

## Cost note (October 2026)
LiveAvatar pricing and session limits are provider-dependent. Official help center describes Lite at roughly one credit/minute, Essential $99/month with ~1100 credits, and 20-minute max sessions. Confirm current account plan before purchase. Continuous avatar 24/7 can be very expensive; prefer 30–60 minute hosted shows and pre-recorded filler between responses.

## Next engineering step
Inspect existing site entrypoints, deployment topology and authentication. Implement an isolated admin route and mock adapter before obtaining credentials. Do not deploy unverified code into production.
