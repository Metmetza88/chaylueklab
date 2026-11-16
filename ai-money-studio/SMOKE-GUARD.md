# SMOKE GUARD AI — prototype in WORAMET AI LAB

## What is implemented
- Responsive Thai browser UI: ai-money-studio/smoke-guard.html
- Safari/Chrome camera access over HTTPS, periodic AI scans about every 3 seconds, and image file upload.
- Bounding boxes with model confidence, stop-camera button, image export, permission and error states.
- Server-side gateway: api/smoke-detect.js to call Roboflow model smoke-uvylj-5sztn/1. The API key never ships in HTML.
- Entry link from ai-money-studio/index.html.
- API contract tests: tests/smoke-guard.test.mjs.

## Status: source code, NOT a public safety service
- GitHub experimental branch: feature/woramet-dojo-mvp-20261113, NOT main.
- AI calls disabled by default. An unconfigured deployment returns HTTP 503, never fake detections.
- The Roboflow Workflow in the same workspace, Smoke Detection (slug smoke-detection-1794825756440), was inspected and its specification validated. Gateway currently uses its detector model directly for compact bounding boxes.
- No live iPhone camera or real smoke scene verified end-to-end. Do not claim accuracy, recall, or false-positive rate.
- No production deployment, Dojo submission, model training, Supabase changes, or payment integrations in this change.

## Deployment on the EXISTING Vercel project
Repository has vercel.json with a static build to _site. The smoke page is in the existing ai-money-studio directory, included by scripts/build-public-site.mjs. The root api/ file is intended as a Vercel Node.js Function, not a static browser asset.

1. Connect this same GitHub repository and experimental branch to an already-owned Vercel project, choosing Preview, not production. Do not create a duplicate repository.
2. Verify the preview's /ai-money-studio/smoke-guard.html returns HTML and /api/smoke-detect returns JSON on GET.
3. Set ROBOFLOW_API_KEY as a private server-side environment variable in that Vercel project. Do not put it in GitHub, HTML, screenshots or public chat.
4. Configure durable API limits and an account spending ceiling with Vercel WAF or a similar service BEFORE public access. The in-memory per-instance throttle is only best-effort and does not guarantee a spending ceiling across multiple instances.
5. Once usage policy, privacy notice and provider terms are approved, set SMOKE_GUARD_ENABLED=1 on Preview, redeploy and test using a safely obtained image (not an actual fire).
6. Verify positive smoke and negative scenes on physical iPhone Safari. Inspect box placement and network speeds.
7. Only after successful tests and explicit consent, decide whether to publish to the public. Do not submit to Dojo or Marketplace automatically.

The service sends a reduced JPEG frame to Roboflow for each request. Users should consent and avoid capturing other people or private information. No images are saved to application storage by this code; provider retention and logs require separate review.

## Local tests (Node.js 24+)
- node --test tests/smoke-guard.test.mjs
- node --test tests/*.test.mjs
- node scripts/build-public-site.mjs

Roboflow's metered endpoint is not called by these tests. They use a mocked fetch response.

## Safety
Cannot detect invisible smoke, distinguish all mist/vapor from smoke, guarantee detection, or replace certified alarms and emergency protocols. "No smoke found" only means the model did not return a box in the sampled image. Continuous camera display is not continuous model inference; scans are around every 3 seconds plus model/network latency. Do not test with an uncontrolled real fire.
