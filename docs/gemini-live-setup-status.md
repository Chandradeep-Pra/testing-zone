# Gemini Live setup status

Verified on 16 September 2026.

- Existing Google Cloud project: `proud-woods-489814-s6` (`917765808203`).
- Billing and Generative Language API: already enabled.
- API Keys management API: enabled during setup.
- Dedicated service account: `gemini-live-viva@proud-woods-489814-s6.iam.gserviceaccount.com`.
- Authorization key: `gemini-live-viva`, bound to that account and restricted to `generativelanguage.googleapis.com`.
- Local server configuration: Git-ignored `.env.local`, containing `GEMINI_API_KEY`, `GEMINI_LIVE_PROJECT_ID` and `GEMINI_LIVE_MODEL`.
- Verified model: `gemini-2.5-flash-native-audio-latest`. This is an alias; verify availability again before release.
- Tests passed: model access, restricted ephemeral token creation, Live WebSocket connection and generated audio response to a synthetic prompt.

The Live route uses `GEMINI_API_KEY` from the server environment. The existing Vertex AI configuration is preserved.

## Next implementation

Build the authenticated token endpoint and browser audio session described in [the implementation guide](gemini-live-viva-implementation.md). Read the Live key only on the server; return restricted ephemeral tokens to the browser. Never use a `NEXT_PUBLIC_` variable for this key.

Local verification can be repeated with `node scripts/check-gemini-live.mjs`. This creates a short-lived token and generates one brief audio response, consuming a small amount of API usage.

## Production work remaining

Store the Live key in Secret Manager and grant only the application runtime access to that secret. Configure Cloud Run to inject it as `GEMINI_API_KEY`, along with the verified model ID. The image does not load local environment files. No Secret Manager secret, Cloud Run revision, spending cap or billing alert was created by this setup. The browser microphone and full viva flow have not yet been implemented or tested.
