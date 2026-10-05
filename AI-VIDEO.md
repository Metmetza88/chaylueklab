# AI Video Studio

Open `ai-video.html` using the same static hosting as this repository. The existing home page links to it as **AI Video Studio**.

The page now sends a generated prompt and the selected image to the existing Supabase Edge Functions (`video-create` and `video-status`) after LINE identity verification. It supports Veo 3.1 (native Thai/Isan audio where the provider account allows it) and Runway Gen-4.5 (visual-only). It polls Queued / Generating / Completed / Failed, stores completed MP4 files in the private `video-generations` bucket, shows an in-page player, and provides a signed download link.

The local image preview is only a preview. No provider success is simulated: without a configured server-side provider credential, the job is marked Failed and the UI names the missing environment variable. The external Google Flow handoff is no longer part of the primary flow.

Deploy `setup-ai-video.sql` in the existing Supabase project after the membership/trial/owner migrations, then deploy the two function folders. Required Edge Function Secrets are documented in the repository handoff; they never belong in this static frontend.

Deployment requirement: keep this page behind hosting-level authentication. This public GitHub repository and a client-side password cannot provide private access. Do not merge or deploy to an unprotected production site. No new repository or hosting project is required.

Current hosting blocker: the accessible Vercel project has not been verified as connected to Metmetza88/chaylueklab. No deployment was made.
