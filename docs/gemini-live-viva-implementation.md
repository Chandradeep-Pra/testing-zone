# Gemini Live Viva Implementation Guide

16 September 2026

## Goal

Build a live medical viva with continuous audio, natural interruptions and case-specific follow-ups. Start with one reviewed case, then validate the same implementation against three cases. Keep the existing viva available during the pilot.

## Before setup

- **Case material:** Choose three cases. For the first, supply the video, timestamped transcript and relevant slides or scans. Use material you can reuse and remove identifiable patient information.
- **Clinical review:** Approve patient facts, assessment objectives, acceptable answers, critical omissions, hint levels and scoring criteria. Separate the opening stem from results revealed later.
- **Google access:** Use the Gemini Developer API for this pilot. Confirm project access, billing or available quota, and a working Live model in Google AI Studio. Existing Vertex AI credentials do not automatically establish this setup.
- **Configuration:** Store the long-lived API key only on the server. Configure the Live model ID separately and confirm SDK compatibility before implementation. The repository already includes `@google/genai`.
- **Browser:** Use HTTPS in deployment or localhost during development, microphone permission and working audio output. Agree a pilot session length, spend limit and transcript retention policy.

## Architecture

Browser microphone and speakers <-> Gemini Live API over a persistent WebSocket

Existing backend -> authenticated session creation, ephemeral tokens, case tools and saved results

Use short-lived, restricted tokens for the browser connection. Google documents this direct connection as avoiding the extra audio proxy hop. Do not put a permanent API key in browser code. [1][2]

Load a compact reviewed case before the call. Keep unrevealed results and authoritative scoring rules on the backend; retrieve results through authorised tools. Browser-delivered content is inspectable, so a prompt is not an access-control boundary.

## Implementation order

### 1 Prepare the first case

Create a versioned record containing: case ID, opening stem, fixed patient facts, objectives, permitted results, disclosure rules, question branches, hints, rubric and source timestamps. Have a clinician approve it. Process videos before the call; do not stream teaching videos into every viva session.

### 2 Create the live session endpoint

Add `POST /api/viva/live/session`. Validate the existing user session and case access, create a session ID, then mint a restricted ephemeral token. Bind supported token constraints to the selected model and session configuration. Return only the token and permitted startup data. Apply rate limits and session limits. Confirm current token API version and expiry settings against Google's guide. [2]

### 3 Build the audio connection

Add `useGeminiLiveSession` and a separate Live Viva screen. Use `@google/genai` to establish one connection after the user presses Start. Implement microphone capture and resampling with an AudioWorklet: send mono 16-bit PCM at 16 kHz; play incoming 24 kHz PCM incrementally. Handle all parts of each server event, including audio and transcripts. Provide start, mute, end, connecting and reconnecting states. [1][3]

### 4 Implement interruption handling

Enable supported automatic voice activity detection and tune it using real candidate answers. Keep listening while the examiner speaks. On interruption, stop active playback, clear queued audio and ignore cancelled tool results. Track interrupted responses so unheard content is not treated as a completed question. Test thinking pauses, corrections and background noise. [3]

### 5 Add the examiner behaviour

Give Gemini the reviewed opening context and rules: one question at a time, stay with the same patient, probe partial answers, increase challenge after strong answers and offer graded hints when needed. Track disclosed facts, covered objectives, previous questions and hints used.

Add authenticated backend tools for result disclosure and stage transitions. Validate every tool request against the session and case. Let ordinary discussion proceed within the loaded case; reserve blocking calls for decisions that need authoritative data. Save detailed evaluation separately from spoken response generation. A failed evaluator must be recorded as a technical failure, not a weak candidate answer.

### 6 Handle recovery and feedback

Implement session resumption, server closing notifications and context compression where supported. Save compact case state independently so reconnects preserve progress. Avoid replaying audio or applying the same tool action twice. On End, close the socket, stop microphone tracks and generate rubric-based feedback from the transcript and hint history. Google's guide documents separate connection and session limits; test beyond the intended pilot duration. [4]

## First release checks

- Complete one 10-minute call with relevant questions, fixed patient facts and no repeated assessment targets.
- Interrupt the examiner mid-sentence; queued speech stops and the reply addresses the interruption.
- Pause mid-answer, correct a medical term and say “I do not know”; the examiner responds appropriately.
- Simulate disconnection and tool failure; progress survives and failures do not reduce the candidate's score.
- Measure answer-end to first audible response. Initial target: median below 2 seconds on the test network; record the 95th percentile and tool-call delays separately. This is a project target, not a provider guarantee.
- Repeat strong, partial and incorrect-answer scenarios across all three cases with clinician review. Check desktop, mobile, session cost and concurrent-session quota before release.

## First deliverable

One reviewed case working as a live call, with interruptions, transcript capture and feedback. Reuse the current app, authentication and database. Defer RAG, fine-tuning, avatars and additional voice infrastructure until this pilot demonstrates acceptable clinical behaviour and latency.

## Official implementation references

1. [Gemini Live overview and audio transport](https://ai.google.dev/gemini-api/docs/live-api)
2. [Ephemeral token creation and restrictions](https://ai.google.dev/gemini-api/docs/live-api/ephemeral-tokens)
3. [Audio events and Live capabilities](https://ai.google.dev/gemini-api/docs/live-api/capabilities)
4. [Session limits and resumption](https://ai.google.dev/gemini-api/docs/live-api/session-management)

Verify model availability, preview status, SDK fields and account limits when implementing. This document defines the proposed build; it does not indicate that API access or live playback has been tested.
