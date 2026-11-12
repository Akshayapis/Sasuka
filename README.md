# U APP — Build Anything. Launch Everywhere.

A premium app-creation platform frontend built with React 19, Vite and Tailwind CSS 4.
It implements the complete product surface described in the U APP master specification:
landing experience, authentication, quota-enforced builder, plans, UPI payment requests,
54 UI templates, ad SDK registry, developer API portal, support, settings and expiring downloads.

## Run locally

```bash
npm install
npm run dev       # development
npm run build     # production bundle in dist/
npm run preview   # preview the production bundle
```

## What is fully functional in this workspace

- **Landing site** — hero with animated phone demo, app-type flows, ZIP language analysis,
  ad SDK showcase, build lifecycle, 54 template previews, API teaser, plans, FAQ and support.
- **Authentication — real Firebase** — Google sign-in via `signInWithPopup` (with redirect
  fallback when popups are blocked), real Email/Password registration and sign-in, real
  password-reset email and real email verification via `sendEmailVerification`. Sessions
  persist on the device. There is no demo account and no simulated login.
- **Workspace** — dashboard, My Apps, activity ledger, downloads, settings, notifications.
- **Builder** — 12 app types, URL validation, real client-side ZIP inspection via JSZip with
  supported/partial/unsupported classification and ZIP-slip reporting, app configuration,
  permissions + `permission.txt`, ads gating, all 54 templates, review and reservation.
- **Quota** — free plan of 3 creations per calendar month, computed from committed projects;
  paid periods count only committed creations; failed validation never charges; rebuilds cost zero.
- **Payments** — order ID, UPI app selection, UTR submission, PENDING status, masked history,
  rejection notes. A plan is **never** activated from browser data.
- **Developer portal** — endpoint contracts, code samples (Python/PHP/JavaScript), SHA-256
  hashed API keys shown once, five-key limit, revocation, plan-gated access, error codes.
- **Ad SDK docs** — 16-network registry, real official documentation links, required credential
  fields, formats, timings, diagnostic terminal and honest setup state.
- **Support** — chat-style conversation, subject/contact/message, attachment preview limited to
  3 MB, text-only delivery warning, preserved failed state and retry.
- **Platform APK builds — no user credentials** — the platform owner configures the build
  service once with deploy-time variables (`VITE_UAPP_GH_OWNER`, `VITE_UAPP_GH_REPO`,
  `VITE_UAPP_GH_WORKFLOW`, `VITE_UAPP_GH_TOKEN`, `VITE_UAPP_GH_REF`). Every user's app is then
  built on the platform's GitHub account and the APK/AAB appears on their download page.
  Users are never asked for a GitHub token, repository or workflow. Builds are queued
  immediately and typically finish in 3–6 minutes.
- **Instant installable build** — when APK credentials are not configured, every app is still
  delivered as a genuinely working installable package (manifest, icons, offline service worker,
  live preview) instead of a failed build.
- **Downloads** — live 9-minute countdown, QR code, generated source package ZIP,
  `permission.txt`, project JSON and expired-link recovery via Create Again at zero credit cost.

## Production integrations (explicitly not simulated)

Settings → Runtime config displays every integration and its live state:

| Capability | Requirement |
| --- | --- |
| Firebase Auth | Already wired client-side. **Authorise your deployment hostname** in Firebase Console → Authentication → Settings → Authorized domains and enable Google + Email/Password providers. |
| OTP and support email | Supplied API called server-side with hashed OTP storage |
| APK / AAB builds | Connect GitHub in Settings; add signing secrets to the repository for release builds. |
| 9-minute artifact storage | Render persistent/volume storage and signed URL service |
| UPI collection | Merchant UPI ID and payee name configured by the future administrator |
| Push notifications | Firebase Cloud Messaging device tokens and server credentials |

The admin panel is intentionally **not built**. Plan changes, payment approval and runtime
settings are designed as secure server-side contracts for a separate future application.

## Deployment artifacts

- `Dockerfile` — multi-stage Node build and nginx static hosting
- `render.yaml` — Render web service with a health check
- `firebase.rules.json` — Realtime Database rules protecting quota, plans and payment state
- `.github/workflows/android-build.yml` — isolated Gradle build + temporary artifact upload
- `.env.example` — required server-side configuration names, no secret values

Never commit real tokens. If a token is exposed in a message or repository, rotate it immediately.


## Owner setup (one time)

### APK build service (background, users never see credentials)
Deployment env:
```
VITE_UAPP_GH_OWNER=your-github-username
VITE_UAPP_GH_REPO=uapp-builds
VITE_UAPP_GH_WORKFLOW=android-build.yml
VITE_UAPP_GH_TOKEN=github_pat_...
VITE_UAPP_GH_REF=main
```
Or open Settings → Runtime config → **Platform build service** and save the values on your device.
Every new app then: creates its own private repository, pushes a complete native Android
WebView project plus the build workflow, dispatches the build, and streams the real APK/AAB to
the user. Target 3–6 minutes, overtime allowed, hard failure at **20 minutes** (no credit charged).
There is no cap of 40 repositories; every app gets its own repo.

### UPI QR
Deployment env or Settings → Runtime config → **Merchant UPI**:
```
VITE_UAPP_UPI_ID=yourbusiness@okhdfcbank
VITE_UAPP_UPI_NAME=Your Business Name
```
The payment page then renders a scannable UPI QR with the exact plan amount and deep links for
Google Pay, PhonePe and Paytm. The plan still activates only after UTR verification.

### Temporary downloads
Links expire after 9 minutes. From My Apps or the download page, copy/share the history link and
use **Create again** to rebuild from preserved source and open a fresh 9-minute window.
