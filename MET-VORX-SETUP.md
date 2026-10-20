# MET VORX in the existing LIFE OS

PR #42 now opens MET VORX as a dialog inside the existing LIFF endpoint. The existing LINE login session is reused; no new LIFF ID or website is required.

Backend: existing Supabase project bxaplhrunxiadjsdobyl, function met-vorx. It verifies LINE identity and checks the existing owner record before calling Gemini. Secrets remain server-side. Configure GEMINI_API_KEY; optional MET_VORX_GEMINI_MODEL overrides the text model.

The old sibling HTML route and Vercel-only API have been replaced by this in-page integration, so GitHub Pages can use the same authenticated backend as LIFE OS.

Validated: 120 unit/security tests, production artifact build. Live unauthenticated requests must return 401. Real Gemini chat/image analysis and iPhone microphone/camera tests remain pending until the owner key and device are available. Do not claim these have passed.
