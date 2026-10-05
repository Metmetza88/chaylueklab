# AI Video Studio · existing Supabase setup

This change stays in `Metmetza88/chaylueklab`. It does not create a new project or publish a new website.

## 1. Database

Run `setup-ai-video.sql` in the existing Supabase project after the repository's existing membership, trial and owner SQL files. It creates the private `video-generations` bucket, job tables, and server-only credit functions.

Credit defaults are deliberately configurable in the migration: Free has 2 credits per Bangkok calendar month and Plus (the existing 59 THB/month membership) has 12. A 4/6/8/10-second job costs `ceil(duration / 4)` credits. A reservation is released if the provider call is rejected; the used balance changes only after a provider job ID is accepted and stored.

## 2. Edge Functions

Deploy these folders to the same Supabase project:

```sh
supabase functions deploy video-create --no-verify-jwt
supabase functions deploy video-status --no-verify-jwt
```

The functions verify the existing LINE ID/access token server-side. They use the existing `SUPABASE_URL` and either `SUPABASE_SECRET_KEYS` or `SUPABASE_SERVICE_ROLE_KEY` already used by the membership functions.

## 3. Server-side secrets to add

Required for the default Veo model:

```text
GEMINI_API_KEY
```

Optional model selection/configuration:

```text
GEMINI_VIDEO_MODEL        # defaults to veo-3.1-generate-preview
GEMINI_VIDEO_RESOLUTION   # defaults to 720p
```

Optional if Runway Gen-4.5 is enabled in the UI:

```text
RUNWAYML_API_SECRET
RUNWAY_VIDEO_MODEL        # defaults to gen4.5
```

These values belong in **Supabase Dashboard → Project Settings → Edge Functions → Secrets** (or `supabase secrets set`). Do not place them in HTML, browser storage, GitHub, or the static host. `SUPABASE_URL`, the service-role secret, and `LINE_LOGIN_CHANNEL_ID` remain server-side as before.

## 4. Runtime behavior

`video-create` calls the selected provider's official image-to-video API and returns the real provider job state. `video-status` polls the provider, downloads a completed MP4 to the private bucket, and returns a one-hour signed URL. The frontend never receives a provider API key or a provider URL for long-term storage.

If a provider secret is absent, the job is marked failed and the response names the missing variable. The UI never displays a simulated completed video.
