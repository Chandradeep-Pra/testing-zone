# AI Viva — Calm and Composed Implementation Plan

## 1. Goal

Redesign **Calm and Composed** mode as a structured, clinically coherent viva that moves quickly through five phases without sounding rushed:

1. Assessment
2. Investigations and interpretation
3. Management
4. Complications
5. Follow-up

The examiner remains calm, concise, and neutral. It asks one focused question at a time, avoids repeating completed topics, and advances as soon as the candidate has shown adequate understanding.

Fast and Furious mode is not changed by this work.

## 2. Interpretation of the supplied diagram

### Phase 1 — Assessment

The candidate should cover:

- Patient history and examination
- Presenting symptoms
- Risk factors
- Associated symptoms
- Medical and surgical history
- Imaging and reporting history where already available
- Lifestyle factors

AI-side responsibility:

- Know the expected assessment points for the case.
- Detect which points were covered, partially covered, missed, or unsafe.
- Ask at most one useful follow-up before moving on.

### Phase 2 — Investigations and interpretation

The candidate should:

- Request appropriate investigations.
- Receive the corresponding result or exhibit when one exists.
- Interpret the result.
- Explain why the test is relevant and how it changes diagnosis or management.

AI-side responsibility:

- Store case-specific investigation reports such as CT, ultrasound, cytology, urodynamics, blood tests, and histology.
- Reveal a result only after the candidate requests or clearly implies the investigation.
- Ask for interpretation without exposing the hidden exhibit description or model answer.
- Never invent a contradictory result when structured case data is available.

### Phase 3 — Management

The candidate should discuss:

- Immediate, medical, surgical, and/or interventional management as appropriate.
- Advantages and disadvantages of relevant options.
- A treatment recommendation based on the history, examination, investigations, diagnosis, comorbidity, and patient factors.
- The mechanism or therapeutic role of a selected treatment when clinically useful.

AI-side responsibility:

- Know the diagnosis-linked treatment options and their indications, trade-offs, and key safety concerns.
- Track the treatment proposed by the candidate.
- Ask one justification question for a major intervention or treatment decision, then move on.

### Phase 4 — Complications

The candidate should:

- Explain relevant complications of the disease and/or proposed treatment.
- Prioritise common, serious, or management-changing complications rather than reciting an exhaustive list.
- State how a selected complication would be recognised, prevented, or managed when appropriate.

AI-side responsibility:

- Ask about complications relevant to the candidate's chosen treatment whenever possible.
- If no treatment was clearly selected, use the most likely definitive treatment for the case and state enough context in the question to avoid ambiguity.

### Phase 5 — Follow-up

The candidate should explain:

- How the patient will be reviewed after treatment.
- Relevant timing, for example early review, six-week review, or longer-term surveillance.
- Clinical assessment, investigations, monitoring, recurrence checks, and escalation triggers.

AI-side responsibility:

- Use diagnosis- and treatment-specific follow-up expectations.
- End after the essential follow-up and safety-netting points have been assessed.

## 3. Target examiner behaviour

The calm examiner should:

- Use a composed UK consultant tone.
- Ask exactly one short question per turn.
- Prefer plain spoken questions over long exam-style prompts.
- Acknowledge only when necessary; avoid repeated “okay”, “good”, or “alright”.
- Never teach, coach, reveal answers, or announce phase names.
- Infer likely medical terms when speech-to-text is imperfect.
- Accept equivalent clinically safe answers rather than matching exact wording.
- Ask no more than one follow-up on a single decision.
- Move forward when a phase is adequately covered, even if the answer was not exhaustive.
- Revisit a missed point only when it is a critical safety item.

Recommended pace targets:

- Normal question: one sentence, ideally under 18 words.
- AI decision plus question response: target under 1.5 seconds excluding TTS/network variability.
- One primary question plus at most one follow-up per phase checkpoint.
- Reserve enough time to reach complications and follow-up.

## 4. Proposed architecture

### 4.1 Use one canonical phase model

Create a shared module, for example `lib/viva-flow.ts`, containing:

```ts
export type CalmVivaPhase =
  | "assessment"
  | "investigations"
  | "management"
  | "complications"
  | "follow_up"
  | "complete";

export type TopicStatus = "unasked" | "partial" | "covered" | "unsafe";

export type CalmVivaState = {
  phase: CalmVivaPhase;
  phaseQuestionCount: number;
  coveredTopics: string[];
  missedCriticalTopics: string[];
  requestedInvestigationIds: string[];
  shownExhibitIds: string[];
  candidateDiagnosis?: string;
  candidateTreatment?: string;
  pendingJustification?: string;
  summary: string;
};
```

Remove the split between `investigations` and `interpretation` and between `management` and `alternatives` at the top level. Those remain subtopics inside the five phases shown in the diagram.

### 4.2 Make each case carry structured calm-mode content

Extend `VivaCaseModes.calmAndComposed` in `lib/viva-case.ts` instead of relying only on free-text objectives and exhibit descriptions.

Suggested shape:

```ts
type CalmPhaseConfig = {
  objectives: string[];
  criticalTopics: string[];
  maxPrimaryQuestions?: number;
};

type InvestigationConfig = {
  id: string;
  aliases: string[];
  report: string;
  exhibitId?: string;
  interpretationPoints: string[];
};

type TreatmentConfig = {
  id: string;
  name: string;
  indications: string[];
  advantages: string[];
  disadvantages: string[];
  mechanism?: string;
  complications: string[];
  followUp: string[];
};

type CalmAndComposedConfig = {
  enabled?: boolean;
  phases: Record<Exclude<CalmVivaPhase, "complete">, CalmPhaseConfig>;
  investigations: InvestigationConfig[];
  diagnoses: Array<{
    name: string;
    aliases: string[];
    treatments: TreatmentConfig[];
  }>;
};
```

Normalization must preserve backward compatibility: older cases without this structure should derive basic phase objectives from `case.objectives`, `marking_criteria`, and `exhibits`.

### 4.3 Preserve the existing API and hook contracts

The delivery architecture must not change. Calm mode continues to use:

- `POST /api/viva/generateFollowup` for the next question and exhibit response.
- `POST /api/viva/updateSummary` for hidden decision state.
- The existing `useVivaEngine` public methods and `VivaApiResponse` shape.

Enhancements are limited to internal prompts, normalized case knowledge, deterministic stage guards, and hidden state names. `generateFollowup` must use the latest exchange directly when the background summary is one turn behind, so the examiner can still advance correctly without altering request or response delivery.

### 4.4 Keep phase progression deterministic

AI should judge answer coverage, but code should enforce the progression rules:

1. Evaluate the latest answer against the current phase objectives.
2. Mark covered, partial, missed-critical, and unsafe points.
3. If a major treatment was proposed and not justified, ask one justification question.
4. If a requested investigation has a configured report, return it and ask for interpretation.
5. If the phase is sufficiently covered, its question budget is exhausted, or time requires progression, advance to the next phase.
6. Never move backwards except for an unresolved critical safety point.
7. End after follow-up or when the timer requires closure.

Suggested completion rule:

- Complete a phase when all critical topics are safe and either 70% of objectives are covered or the phase question budget is reached.
- Do not use the percentage as a clinical score; it is only a conversation progression rule.

### 4.5 Reserve time by phase

Use the existing case duration but add soft deadlines so the session reaches the full pathway:

| Phase | Target share |
| --- | ---: |
| Assessment | 20% |
| Investigations and interpretation | 25% |
| Management | 30% |
| Complications | 15% |
| Follow-up | 10% |

If a soft deadline is reached, finish the current answer and advance unless a critical safety clarification is pending. This keeps the viva engaging without making the examiner sound hurried.

## 5. Server implementation

### Step 1 — Schema and normalization

Update `lib/viva-case.ts` to:

- Add the structured Calm mode types.
- Normalize phase objectives, investigations, diagnosis, treatments, complications, and follow-up.
- Validate exhibit references.
- Supply a safe fallback for legacy case records.

### Step 2 — Shared flow types and rules

Add `lib/viva-flow.ts` to:

- Define the canonical five phases and state.
- Define phase ordering and time allocation.
- Provide pure helpers such as `getNextPhase`, `shouldAdvancePhase`, and `getAvailableInvestigation`.
- Keep these rules unit-testable without Gemini.

### Step 3 — Enhance the existing decision endpoints

Update `app/api/viva/generateFollowup/route.ts` and `app/api/viva/updateSummary/route.ts` internally:

- Keep their current request and response contracts.
- Normalize the case and use only relevant phase knowledge.
- Apply server-side guards to phase transitions.
- Return a short professional fallback question if generation or parsing fails.
- Never return a humorous or unprofessional failure message to the candidate.

### Step 4 — Prompt design

Move active Calm examiner instructions into one prompt builder used by the endpoint. The prompt should explicitly encode:

- Five-phase order.
- One-question and one-follow-up limits.
- Calm, concise spoken style.
- Coverage evaluation with STT tolerance.
- Investigation reveal rules.
- Treatment justification, complications, and treatment-specific follow-up.
- Strict structured response format.

`ai-viva-data/examinerPrompt.ts` is currently not wired into `generateFollowup`; either integrate it through the new prompt builder or remove the unused duplicate after verifying no other consumer imports it.

### Step 5 — Scoring alignment

Update `app/api/viva/generateScore/route.ts` to include phase coverage and critical-safety misses alongside the transcript. Keep the four existing score domains for UI compatibility, but ensure that omissions in assessment, interpretation, management safety, complications, and follow-up affect the relevant domain reasoning.

## 6. Client implementation

Update `components/ai-viva/useVivaEngine.ts` to:

- Store the returned `CalmVivaState` synchronously after every answer.
- Remove the background summary queue for Calm mode.
- Send only the latest answer, current question, current state, elapsed/remaining time, and case ID/data required by the endpoint.
- Continue tracking shown exhibits locally as a defensive check.
- Preserve the existing Fast mode keyword engine unchanged.

Update `components/ai-viva/VivaVoiceAi.tsx` only where required to:

- Handle `ask`, `show_investigation`, and `end` actions.
- Display an exhibit/report before speaking the interpretation question.
- Preserve the current rule that listening starts only after examiner speech ends.
- Use a professional deterministic fallback if the next-turn request fails.

No phase label needs to be shown to the candidate. In development builds, optionally expose the phase and coverage state in a debug panel or console event.

## 7. Performance plan

To keep Calm mode fast:

- Keep next-question generation compact and allow summary maintenance to remain non-blocking.
- Send the latest one or two exchanges plus a compact state summary, not the entire transcript.
- Keep case knowledge structured and include only data relevant to the current phase.
- Use JSON schema/structured generation instead of parsing ad hoc plain text fields.
- Preload or cache common opening prompts and deterministic transition prompts.
- Start TTS as soon as the validated question is available.
- Add request timeout handling and a clinically neutral fallback question.
- Record timing for STT finalization, model response, TTS generation, and total turn latency.

## 8. Testing plan

### Unit tests

- Phase ordering never skips required safety gates or moves backwards unexpectedly.
- Assessment transitions to investigations once sufficient coverage is reached.
- Requested investigation aliases map to the correct configured report.
- An exhibit cannot be shown twice.
- A treatment decision triggers no more than one justification question.
- Candidate-selected treatment drives the complications and follow-up questions.
- Legacy case records normalize without crashing.
- Invalid model output uses a professional fallback.

### API contract tests

- Every response matches `CalmTurnResponse`.
- `ask` always contains one non-empty question.
- `show_investigation` references a valid investigation/exhibit.
- `end` cannot occur before minimum phase coverage unless time has expired or the user ends the session.
- Prompt injection inside a spoken answer cannot override examiner rules or reveal hidden case data.

### Conversation scenarios

Test at least these scripted candidates:

1. Strong candidate: complete answers cause rapid progression with minimal follow-ups.
2. Partial candidate: one focused probe is asked, then the examiner moves on.
3. Unsafe candidate: a safety clarification is asked and recorded for scoring.
4. Verbose candidate: the examiner does not repeat already covered points.
5. Investigation request: the correct report/exhibit is revealed and interpretation is requested.
6. Alternative treatment: complications and follow-up follow the candidate's chosen option.
7. STT errors: likely clinical intent is interpreted fairly.
8. Slow/network failure: fallback remains composed and the session can continue or close safely.

### Acceptance criteria

- All five phases are reached in a normal timed session.
- No question contains more than one clinical task.
- No completed topic is re-asked unless it is a critical safety issue.
- Major treatment choices receive at most one justification follow-up.
- Investigation results are case-backed and never fabricated inconsistently.
- Complication and follow-up questions reflect the selected treatment.
- Median server-side next-turn latency improves compared with the current two-call design.
- Fast and Furious behaviour and tests remain unchanged.

## 9. Suggested delivery sequence

1. Add shared five-phase types, case schema, normalization, and fixtures.
2. Add deterministic progression helpers and unit tests.
3. Enhance the existing Calm endpoints internally with phase rules and professional fallbacks.
4. Align `useVivaEngine` hidden state with the five phases without changing its public contract.
5. Add investigation report/exhibit handling in the session UI.
6. Align scoring with phase coverage and critical safety misses.
7. Run scripted conversation tests and tune question budgets and time shares.
8. Remove obsolete Calm summary/follow-up code after production-equivalent verification.

## 10. Open decisions before implementation

These do not block the technical foundation, but should be confirmed before final behaviour is tuned:

1. **Case authoring source:** Will investigation reports, treatments, complications, and follow-up be added to the upstream Urologics viva-case API, or should this app temporarily derive them with AI?
2. **Investigation delivery:** Should non-image results be spoken by the examiner, displayed as a report card, or both?
3. **Candidate treatment:** If the candidate chooses a safe but non-preferred treatment, should the examiner follow that pathway, challenge it once, or redirect to the case's preferred treatment?
4. **Follow-up wording:** The diagram appears to say “six-weekly checkup”; is that a case-specific example rather than a universal interval?
5. **Phase numbering:** I interpreted the handwritten labels as phases 1–5 despite the visible labels resembling `1.5`, `3`, `4`, `1`, and `.5`.
