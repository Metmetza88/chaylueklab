# AI Video Studio

Open `ai-video.html` using the same static hosting as this repository. The existing home page links to it.

Features: local JPEG/PNG/WebP selection (10 MB limit), aspect ratio, desired duration, Thai/Isan dialogue, Flow/Kling/Runway prompt formats, reference fidelity instructions, scene outline, animated image preview, clipboard and UTF-8 text download. Images and dialogue are not sent to a server or stored persistently.

The preview is a CSS image animation, not generated video. Video and speech are generated in the selected external tool. Model duration and audio availability must be checked there.

Deployment requirement: keep this page behind hosting-level authentication. This public GitHub repository and a client-side password cannot provide private access. Do not merge or deploy to an unprotected production site. No new repository or hosting project is required.

Current hosting blocker: the accessible Vercel project has not been verified as connected to Metmetza88/chaylueklab. No deployment was made.
