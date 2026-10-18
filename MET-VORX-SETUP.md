# MET VORX deployment checklist

Existing repo: Metmetza88/chaylueklab. Existing LIFF ID: 2011681452-yexLrODy.

Files:
- met-vorx.html: owner-facing mobile UI
- api/met-vorx.js: LINE token verification, owner allowlist and Gemini server call
- assets/liff-command-center.js: /เมท command and navigation entry

## Required Vercel environment variables
- GEMINI_API_KEY: server-only Gemini API key
- MET_VORX_LINE_CHANNEL_ID: numeric LINE Login channel ID associated with the LIFF app (not the LIFF ID)
- MET_VORX_LINE_USER_IDS: comma-separated exact LINE user IDs allowed to access AI
- MET_VORX_GEMINI_MODEL: optional model, default gemini-2.5-flash

Do not commit secrets. Add variables to the same existing Vercel project and deploy after review. Without these variables API returns HTTP 503 NOT_CONFIGURED and does not invoke Gemini.

## Checks before merging
1. Confirm LINE Developers LIFF endpoint covers https://chaylueklab.com/met-vorx.html and LINE Login channel matches.
2. Confirm Vercel project is deploying Metmetza88/chaylueklab and supports /api/met-vorx.
3. Verify user allowlist blocks non-owner LINE accounts with 403.
4. Test iPhone LINE in-app browser microphone, camera and image upload. Browser speech recognition may be unsupported.
5. Test actual Gemini chat, image and quota error responses. Verify no Gemini key appears in browser network requests.
6. Confirm original Life OS, stock, LINE OA and พ.สมนึก 2&3 remain unchanged.

Security: never accept a LINE user ID from the client as authentication; backend verifies LINE access token with LINE, fetches user profile and checks allowlist. Keep original LIFF and existing features unchanged.

Limitations: no iPhone system-wide screen share/control; uploaded screenshots only. Voice uses browser speech interfaces where supported, not Gemini Live API. AI model use may incur charges.
