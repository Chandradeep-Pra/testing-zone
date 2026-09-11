## Current environment source: .env.prod.stud

The /web app now defaults to this repository's `.env.prod.stud`:

```powershell
node scripts/build-cloud-run.mjs urologics-web-app:local
node scripts/run-cloud-run.mjs urologics-web-app:local
```

The build forwards only `NEXT_PUBLIC_FIREBASE_API_KEY`. The local run helper parses all variables (including quoted JSON/multiline values) and passes them through the Docker client's environment at runtime. Neither command copies or mounts the environment file. `.dockerignore` continues to exclude it. On Cloud Run, inject runtime settings and secrets from this file using environment variables / Secret Manager; the image does not load the file automatically. The previously documented deploy command preserves existing runtime settings and does not import this file.

**Firebase parity must be rechecked:** the key in `.env.prod.stud` differs from the main app's `.env.prod` key. A different key does not prove a different project, but no project ID/auth domain is supplied in the student file. Earlier image/parity results below refer to the previous main-env build, not this new environment source. No image rebuild, deployment or external configuration change was performed for this environment-source update.

# Deploying Urologics Web

The existing Next.js configuration is preserved: `basePath: "/web"`, `output: "standalone"`, and `turbopack.root: process.cwd()`.

## Build and routing

Build for Linux amd64 (Cloud Run) from this directory. Set `NEXT_PUBLIC_FIREBASE_API_KEY` in the build process to the **same public web API key as the main application**:

```sh
node scripts/build-cloud-run.mjs IMAGE
# Or, after setting the same public key in the build environment:
docker build --platform linux/amd64 --build-arg NEXT_PUBLIC_FIREBASE_API_KEY -t IMAGE .
docker run --rm -p 8080:8080 IMAGE
```

The Docker build fails if this key is absent. It is a public browser setting compiled into JavaScript; changing it in Cloud Run at runtime does not change the client. Do not supply private credentials as build arguments. The Docker context uses a deny-by-default allowlist and excludes all `.env*` files, including nested production environments, keys and credential files. The final image contains only standalone output, Next static assets and public assets; it runs as the non-root `node` user on `0.0.0.0:$PORT` (8080 by default).

The main repository `../urocms/firebase.json` configures Firebase Hosting site `proud-woods-489814-s6` in `asia-south1`: `urologics-web-app` serves `/web`, while `urologics-web` serves the main application. Hosting must route **both `/web` and `/web/*`** to this Cloud Run service, preserving the complete path and query string. Keep `/api/*` and all other main-app paths on the main service. Do not strip `/web`, add a second prefix, or rewrite main-app APIs to `/web/api`. The Cloud Run service alone does not configure this domain routing.

Next Link/router paths remain app-relative because Next adds basePath. Browser fetches, plain anchors, local images and audio worklets use `appPath`. That helper preserves external/absolute API URLs, protocol-relative URLs, URL schemes, fragments and already-prefixed paths. Login return destinations are local and normalized before passing to the Next router. Upstream absolute URLs remain unchanged, including the separate speech WebSocket service.

Server configuration is injected at runtime via Cloud Run variables and Secret Manager as appropriate:

- `UROLOGICS_API_BASE` (or existing `VIVA_API_BASE` / `NEXT_PUBLIC_UROLOGICS_API_BASE_URL` fallback): main application origin, normally `https://urologics.co.uk`, **without `/web`**.
- `VIVA_API_BASE`: also used directly by viva data fetching; normally the main origin.
- `GOOGLE_APPLICATION_CREDENTIALS_JSON` and optional `GCP_PROJECT_ID` / `GOOGLE_CLOUD_PROJECT`: existing speech and Vertex integrations currently require JSON credentials. Supply through Secret Manager, never the image.
- `LIVEAVATAR_API_KEY`, `LIVEAVATAR_AVATAR_ID`, `LIVEAVATAR_VOICE_ID`, `LIVEAVATAR_CONTEXT_ID`, `LIVEAVATAR_LANGUAGE`: as required by the avatar feature.
- `EMAIL_USER`, `EMAIL_PASS`: report delivery.

The separate STT WebSocket endpoint remains `wss://testing-zone-hx7q.onrender.com`; this image does not run the `server/` service.

## Authentication review — release limitations

Compared with the neighboring `../urocms` main-app checkout:

- Its `.env.prod` and `.env.local` public Firebase API key, auth domain and project ID match; its Firebase client and Admin project IDs also match. No environment values were copied into this repository. This app has no local environment file or configured Firebase process variable. The Docker validation build is supplied the public API key read from the main checkout's `.env.prod`. The reproducible build helper checks that the main client/Admin project IDs agree before forwarding only the public key.
- This app uses Firebase REST password/refresh endpoints with `NEXT_PUBLIC_FIREBASE_API_KEY`, rather than the Firebase client SDK. Those endpoints select the project by API key; authDomain/projectId are not REST request configuration. Every release must use the main app's key. The configured Auth project is `urologics` (`urologics.firebaseapp.com`), separate from Hosting project `proud-woods-489814-s6`. The local main checkout is evidence of configuration intent, not proof of the configuration currently deployed to production.
- The main app's `lib/testingZoneAuthHandoff.ts` explicitly writes `urologics-testing-zone-auth` with matching ID token, refresh token and profile fields. This app restores that record. Main-to-web login therefore has a compatible handoff **on the exact same HTTPS origin**; a run.app host or www variant cannot share localStorage.
- Login directly at `/web/login` writes only this app's custom record. It does not sign the main app's Firebase SDK in. Bidirectional SSO is not implemented.
- Firebase Hosting only forwards `__session` cookies. The playback cookie has therefore been renamed to `__session` in its writer and reader. The `__session` cookie is a short-lived raw Firebase ID token for video playback and authenticated mock exams, not a Firebase Admin session cookie. It is HttpOnly, Secure in production, SameSite=Lax, and **Path=/** for both creation and deletion, with private/no-store session responses. The main app uses Firebase SDK persistence and Bearer authentication, and does not consume this cookie as its login session. Cookie Path alone cannot create shared login.
- Web logout writes the flag understood by the main app. An already-open web tab does not subscribe to main-app logout/storage changes; main logout does not clear the playback cookie. Session refresh occurs on restoration/explicit refresh, not an automatic timer. Long-running tabs can retain stale state or encounter expired tokens.
- The playback session endpoint accepts a supplied token without validating it at cookie creation; video upstream authentication must validate it. Cookie synchronization errors are currently ignored by the auth provider.

Do not treat shared login/logout as fully verified. Before deployment, validate a real account on the intended origin: main login ? `/web`, refresh, protected API/video playback, login directly in `/web`, logout in both directions with multiple tabs, and expiry. The missing reverse SDK login and live logout synchronization need a coordinated authentication change if seamless bidirectional sessions are required.

## Verification

Run `npm run typecheck`, `npm run lint`, `npm run build` and `node --test tests/deployment-paths.test.mjs tests/viva-tts-voice.test.cjs tests/session-cookie.test.mjs`.

The lint repair uses a keyed video-player instance to reset state when a lesson changes; CommonJS imports are allowed only in CommonJS tests, and the test harness no longer shadows `module`. Existing lint warnings remain visible.

An unused `components/EmailSender.tsx` references `/api/send-email`, which has no matching route; the active score page uses `/api/send-report`. Do not enable that legacy component without correcting its API contract.


Final local standalone smoke checks passed for `/web`, login/courses pages, public images, favicon, audio worklet, compiled JS chunks, optimized logo, viva redirect, API routing boundary and production `__session` cookie flags. The cookie check uses a synthetic token; it does not verify a real Firebase login. Run `node tests/run-deployment-smoke.mjs` after building to repeat it (uses local port 8085).

The exact two-service image/deployment commands, manual provider URL review and main-app lint limitation are in `../urocms/docs/firebase-hosting.md`. No deployment or external service change was performed.

Final Linux image validation passed (`urologics-web-app:deployment-check`, linux/amd64, UID/GID 1000, user `node`). The image serves on container port 8080, passes the same HTTP smoke checks, contains no `.env*` files under `/app`, and its served client JavaScript contains exactly the public Firebase key from the main app's production configuration. The temporary local container was stopped. No credentials, cloud resources or live account state were changed.

TypeScript and production builds passed, lint passed with 20 existing warnings, and all 9 path/session/speech regression tests passed. The first image build hit an npm connection reset; a retry and final cached rebuild succeeded.
