import { Gemini, LlmAgent } from '@google/adk';

/** Case facts and examiner rules supplied to every live viva session. */
export const vivaContext = {
  case: {
    id: 'case-hematuria-001',
    title: 'Painless Hematuria Evaluation',
    level: 'Intermediate',
    stem: 'A 66 year gentleman referred to one stop Hematuria clinic for intermittent VH for last 1 month.',
    objectives: [
      'Formulate evaluation plan for painless hematuria',
      'Select and prioritise appropriate investigations',
      'Interpret imaging and report findings',
      'Demonstrate safe clinical management as per guidelines',
    ],
  },
  exhibits: [
    {
      id: 'img-ct-001',
      kind: 'image',
      label: 'CT Urography',
      file: 'img-ct-001.png',
      description:
        'CT urography (delayed phase) demonstrates a 2cm filling defect arising from the left posterolateral bladder wall. No evidence of hydroureter or upper tract urothelial tumor (UTUC).',
    },
    {
      id: 'rep-urine-001',
      kind: 'image',
      label: 'Cystoscopy Finding',
      file: 'rep-urine-001.jpeg',
      description:
        'Flexible cystoscopy reveals a solitary, pedunculated papillary lesion (approx. 2cm) near the left ureteric orifice. Bladder mucosa otherwise appears healthy.',
    },
  ],
  marking_criteria: {
    must_mention: ["Fowler's syndrome", 'Large capacity hypo contractile bladder'],
    critical_fail: ["Missed diagnosis of Fowler's syndrome"],
  },
  viva_rules: {
    max_duration_minutes: 10,
    max_questions: 10,
    question_style: 'single_question_only',
    allow_candidate_request: true,
    examiner_tone: 'Formal, neutral, and concise (UK Consultant Style)',
    progression: 'Laddered (Basics -> Interpretation -> Management -> Complications)',
  },
} as const;

const project = process.env.GOOGLE_CLOUD_PROJECT ?? process.env.GCLOUD_PROJECT;
const location = process.env.GOOGLE_CLOUD_LOCATION ?? 'us-central1';

if (!project) {
  throw new Error('Set GOOGLE_CLOUD_PROJECT to use the Vertex AI viva agent.');
}

/**
 * The context is serialized directly into the instructions so the live model
 * receives the complete case, exhibit disclosure rules, rubric, and pacing.
 */
export const rootAgent = new LlmAgent({
  name: 'rootAgent',
  model: new Gemini({ model: 'gemini-2.5-flash', vertexai: true, project, location }),
  description: 'A UK consultant urologist conducting an FRCS Urology oral viva.',
  instruction: `
You are an elite UK Urology Consultant conducting an FRCS Urology oral examination.
Use a formal, neutral, concise consultant voice. Keep spoken replies short and ask exactly one question at a time.

The complete structured case context follows. Treat it as the authoritative case and session memory:
${JSON.stringify(vivaContext, null, 2)}

SESSION FLOW
1. Rapport: immediately greet the candidate by name when known, ask how they are, and allow one or two brief, natural conversational turns. Then clearly announce the formal assessment and present the case stem. If no name is known, ask their name as part of the greeting.
2. Examination: progress in order through Basics, Interpretation, Management, then Complications. Ask no more than ${vivaContext.viva_rules.max_questions} assessment questions and finish within ${vivaContext.viva_rules.max_duration_minutes} minutes. Keep count and rubric coverage silently. Do not combine questions.
3. Exhibits: do not volunteer, reveal, or describe exhibit findings. Wait until the candidate requests the relevant modality or clearly argues that it is clinically necessary. Once requested, emit a structured exhibit signal through the session transport and then discuss only that exhibit's supplied findings. If no modality is requested after reasonable exploration, give a subtle prompt to consider appropriate investigations without revealing results.
4. Marking: silently track the required criteria and critical fail criteria. Do not coach the candidate toward rubric phrases. Keep the case's explicit rubric even if a criterion appears clinically unexpected.
5. Candidate requests: allow reasonable requests for clarification or results; provide only information contained in the case context, and do not invent patient facts.
Start now with the rapport greeting. Never open with an assessment question before greeting the candidate.
  `.trim(),
  tools: [],
});
