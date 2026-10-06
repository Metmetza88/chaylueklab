# AI Video Studio

Open `ai-video.html` using the same static hosting as this repository. The existing home page links to it as **AI Video Studio**.

The Studio reuses `data/newsroom-config.js` for the existing LIFF and active Supabase API instead of a separate hard-coded project. The current active Video functions are in `yobymeygbfiwlngmwjcn`. The old `bxaplhrunxiadjsdobyl` Video Status route returned HTTP 404 on 6 October 2026; the active route returned HTTP 200 with Veo configured and Runway unconfigured. Life OS billing configuration is preserved separately.

The page now sends a generated prompt and the selected image to the existing Supabase Edge Functions (`video-create` and `video-status`) after LINE identity verification. It supports Veo 3.1 (native Thai/Isan audio where the provider account allows it) and Runway Gen-4.5 (visual-only). It polls Queued / Generating / Completed / Failed, stores completed MP4 files in the private `video-generations` bucket, shows an in-page player, and provides a signed download link.

The local image preview is only a preview. No provider success is simulated: without a configured server-side provider credential, the job is marked Failed and the UI names the missing environment variable. The external Google Flow handoff is no longer part of the primary flow.

Video Create version 4 and Video Status version 3 are active in the existing project. The frontend renders uploaded bytes only through an image element. Preview and download accept HTTPS signed URLs from the configured project's private `video-generations` bucket. Provider keys stay in Supabase Edge Function Secrets; the existing Veo key does not need to be added again.

The public Studio asks users to authenticate with the existing LINE app before requesting a generation. The server verifies LINE identity, membership and quota before contacting a paid provider. No client password or new login system is introduced.

The GitHub Pages workflow deploys the existing site after quality checks and CodeQL pass. Mobile browser verification covers upload preview and prompt creation without sending a paid generation. A completed real paid generation still requires the owner to log in and test their provider account. The separately hosted main domain remains blocked by access to its existing publisher, as documented in `AUTOMATION.md`.
