# CHAYLUEKLAB — Live Phishing Exercise (Pilot 02)

Status: **not deployed / no emails sent for pilot 02**.

## Scope
- Authorized pilot recipient: wattumongkon88@gmail.com
- Sender: mwaramet888@gmail.com
- Campaign: awareness-2026-02
- Never collect passwords, MFA codes, session cookies, or browser fingerprints.
- Never impersonate real login endpoints or proxy authentication.
- Run only with authorized recipients and approved domain(s).

## Required production architecture
1. Protected administrator dashboard with server-side authentication and RBAC.
2. Verified outbound mail sender, explicit recipient allowlist, per-campaign approval, and kill switch.
3. Signed, expiring, single-use opaque link identifiers (not email addresses in URLs).
4. Server-side click event collection with retention and access controls. Record campaign ID, pseudonymous recipient ID, event type, timestamp. No raw credentials or full IPs.
5. Landing page explains the exercise and provides training, without password fields.
6. Rate limiting, CSRF protections, audit trail, anti-abuse checks and CSV export.
7. Gmail delivery confirmation must be distinguished from inbox placement, email opens, and human clicks (link scanners can cause false positives).
8. Test on a staging domain and with an approved mailbox before enabling a campaign.

## Data policy
- Aggregate by department only above a minimum cohort size.
- Retain detailed records for at most 30 days unless a policy requires otherwise.
- Avoid using results for employee punishment.
- Provide notice, authorized purpose, access controls, and deletion process consistent with applicable privacy rules.

## Pilot acceptance criteria
- Mail delivery confirmed to allowlisted recipient.
- Click recorded exactly once even if retried.
- Automated scanner events are labeled uncertain.
- No collection of password, OTP, cookies, or session credentials.
- Kill switch disables new sends and event ingestion.
- Dashboard restricted to authorized admin.

## Deployment gate
Do not enable live tracking or send campaign 02 until sender domain, storage, admin access and recipient consent/authorization have been verified. This document alone does not constitute a deployed service.
