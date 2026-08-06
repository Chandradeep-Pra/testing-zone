import { NextRequest, NextResponse } from "next/server";

import { geminiModel } from "@/lib/gemni";
import {
  getDefaultVivaCase,
  normalizeVivaCase,
  type CalmAndComposedConfig,
  type VivaCaseRecord,
} from "@/lib/viva-case";
import {
  cleanFollowupResponse,
  formatAvailableExhibits,
  formatPhaseContext,
  formatRecentQA,
  getVivaStage,
  parseFollowupResponse,
} from "@/lib/viva-followup";

type FollowupRequest = {
  previousQA: Array<{ question: string; answer: string }>;
  exit?: boolean;
  shownExhibitIds?: string[];
  vivaCase?: VivaCaseRecord;
  vivaSummary?: string;
  currentStage?: string;
  coveredTopics?: string[];
  weakAreas?: string[];
  caseStory?: string;
  askedQuestions?: string[];
};

const PHASE_FALLBACK_QUESTIONS: Record<string, string[]> = {
  assessment: [
    "Which features in this history increase the risk of malignancy?",
    "What important associated symptoms would you clarify?",
    "Which examination findings would change your immediate approach?",
    "How do his comorbidities and medication affect your assessment?",
    "What is your clinical problem representation for this patient?",
  ],
  investigations: [
    "What is your working diagnosis based on these findings?",
    "Which differential diagnoses remain after these findings?",
    "How do these findings alter your assessment of malignancy risk?",
    "What important information is still missing before treatment?",
    "How would you confirm the diagnosis and obtain histology?",
    "Which findings would determine subsequent risk stratification?",
    "How would normal upper tracts affect your interpretation?",
  ],
  management: [
    "What medical, lifestyle, or surgical treatment would you recommend?",
    "What are the advantages and disadvantages of the alternatives?",
    "How would you adapt treatment to this patient's comorbidities?",
    "What outcome would you expect from your preferred treatment?",
    "What would make you choose an alternative approach?",
    "How would histology alter your subsequent management?",
  ],
  complications: [
    "Which treatment complications would you discuss, including their approximate incidence?",
    "How would you manage those complications medically or surgically?",
    "Which complication requires the most urgent recognition?",
    "How would you investigate suspected postoperative bleeding?",
    "Which patient factors increase the complication risk?",
  ],
  follow_up: [
    "How would you follow this patient after treatment?",
    "What would prompt an earlier review?",
    "Which surveillance tests would you arrange and when?",
    "What recurrence symptoms should the patient report?",
    "How would follow-up change with the final risk category?",
  ],
};

function normalizeQuestion(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function questionsAreSimilar(left: string, right: string) {
  const ignored = new Set(["a", "an", "the", "this", "that", "what", "which", "would", "you", "your", "how", "do", "is", "are"]);
  const tokens = (value: string) =>
    new Set(normalizeQuestion(value).split(" ").filter((token) => token && !ignored.has(token)));
  const leftTokens = tokens(left);
  const rightTokens = tokens(right);
  if (!leftTokens.size || !rightTokens.size) return normalizeQuestion(left) === normalizeQuestion(right);
  const shared = [...leftTokens].filter((token) => rightTokens.has(token)).length;
  return shared / Math.min(leftTokens.size, rightTokens.size) >= 0.6;
}

function getPhaseFallbackQuestion(stage: string, askedQuestions: string[], latestAnswer = "") {
  const candidates = PHASE_FALLBACK_QUESTIONS[stage] || PHASE_FALLBACK_QUESTIONS.assessment;
  const normalizedAnswer = latestAnswer.toLowerCase();

  if (
    stage === "investigations" &&
    /\b(turbt|resection|mitomycin|mmc|treatment|manage|surgery)\b/i.test(normalizedAnswer) &&
    !/\b(diagnos|carcinoma|cancer|tumou?r|malignan)\b/i.test(normalizedAnswer)
  ) {
    const challenge = "Before discussing treatment, what is your working diagnosis?";
    if (!askedQuestions.some((asked) => questionsAreSimilar(challenge, asked))) return challenge;
  }

  return (
    candidates.find(
      (question) => !askedQuestions.some((asked) => questionsAreSimilar(question, asked)),
    ) || "Please summarise your current clinical conclusion for this patient."
  );
}

function ensureDiscussionQuestion(params: {
  response: ReturnType<typeof parseFollowupResponse>;
  stage: string;
  askedQuestions: string[];
  latestAnswer: string;
}) {
  const repeated = params.askedQuestions.some((asked) =>
    questionsAreSimilar(params.response.question, asked),
  );
  if (!repeated) return params.response;
  return {
    ...params.response,
    question: getPhaseFallbackQuestion(
      params.stage,
      params.askedQuestions,
      params.latestAnswer,
    ),
    imageUsed: false,
    imageLink: null,
    imageDescription: null,
    imageId: null,
  };
}

function getExhibitDisplayName(label: string, kind: string) {
  const cleaned = label.trim().replace(/^(the|an?|exhibit)\s+/i, "");
  if (cleaned && !/^exhibit\s*\d*$/i.test(cleaned)) return cleaned;
  return kind.toLowerCase().includes("image") ? "image" : cleaned || "image";
}

function attachRequestedExhibit(params: {
  response: ReturnType<typeof parseFollowupResponse>;
  vivaCase: VivaCaseRecord;
  shownExhibitIds: string[];
  stage: string;
}) {
  if (params.stage !== "investigations") return params.response;

  const shown = new Set(params.shownExhibitIds.map((id) => id.toLowerCase()));
  const available = params.vivaCase.exhibits.filter(
    (item) => !shown.has(item.id.toLowerCase()),
  );
  const linked = params.response.imageLink
    ? available.find((item) => {
        const link = item.url || (item.file ? `/exhibits/${item.file}` : null);
        return link === params.response.imageLink;
      })
    : undefined;
  const requestsInterpretation =
    /\b(interpret|describe|review|findings?)\b/i.test(params.response.question) &&
    /\b(exhibit|image|scan|film|x-?ray|ct|mri|ultrasound|urogram|report)\b/i.test(
      params.response.question,
    );
  const exhibit = linked || ((params.response.imageUsed || requestsInterpretation) ? available[0] : undefined);
  if (!exhibit) return params.response;

  const imageLink = exhibit.url || (exhibit.file ? `/exhibits/${exhibit.file}` : null);
  if (!imageLink) return params.response;

  const displayName = getExhibitDisplayName(exhibit.label, exhibit.kind);
  let question = params.response.question
    .replace(/\b(?:the|this|an?)\s+exhibit\b/gi, `this ${displayName}`)
    .replace(/\bexhibit\b/gi, displayName);

  if (requestsInterpretation && !question.toLowerCase().includes(displayName.toLowerCase())) {
    question = `Please interpret this ${displayName}.`;
  }

  return {
    ...params.response,
    question,
    imageUsed: true,
    imageLink,
    imageDescription: exhibit.description || null,
    imageId: exhibit.id,
  };
}

async function generateFollowupText(prompt: string) {
  const generation = geminiModel.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      maxOutputTokens: 96,
      temperature: 0.2,
    },
  });
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(
      () => reject(new Error("Follow-up generation timed out")),
      8_000,
    );
  });
  const result = await Promise.race([generation, timeout]).finally(() => {
    if (timeoutId) clearTimeout(timeoutId);
  });
  const rawText = result.response?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof rawText !== "string") {
    throw new Error("Unexpected Gemini response structure");
  }
  return rawText;
}

export async function POST(req: NextRequest) {
  const {
    previousQA,
    exit,
    shownExhibitIds = [],
    vivaCase: rawVivaCase,
    vivaSummary = "",
    currentStage = "assessment",
    coveredTopics = [],
    weakAreas = [],
    caseStory = "",
    askedQuestions = [],
  } = (await req.json()) as FollowupRequest;

  const vivaCase = rawVivaCase ? normalizeVivaCase(rawVivaCase) : getDefaultVivaCase();

  if (!Array.isArray(previousQA)) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }

  if (exit) {
    const combinedQA = previousQA
      .map(({ question, answer }) => `Q: ${question}\nA: ${answer}`)
      .join("\n\n");

    const prompt = `
You are an FRCS examiner.

Case Title: ${vivaCase.case.title}
Case Stem: ${vivaCase.case.stem}

Evaluate the candidate across:

1. basic_knowledge
2. higher_order_processing
3. clinical_skills
4. professionalism

Questions and Answers:
${combinedQA}

Return JSON only.
`;

    const result = await geminiModel.generateContent(prompt);
    const rawText = result.response?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (typeof rawText !== "string") {
      throw new Error("Unexpected Gemini response structure");
    }

    const text = cleanFollowupResponse(rawText);

    try {
      const evaluation = JSON.parse(text);
      return NextResponse.json({ evaluation });
    } catch {
      return NextResponse.json({ evaluation: text });
    }
  }

  if (previousQA.length === 0) {
    const stem = vivaCase.case.stem.trim();
    return NextResponse.json({
      question: /\?\s*$/.test(stem) ? stem : `${stem} How would you evaluate this patient?`,
      imageUsed: false,
      imageLink: null,
      imageDescription: null,
    });
  }

  const recentQA = formatRecentQA(previousQA);
  const availableExhibits = formatAvailableExhibits(vivaCase, shownExhibitIds);
  const calmConfig = vivaCase.modes?.calmAndComposed as CalmAndComposedConfig | undefined;
  const stage = getVivaStage(currentStage);
  const referenceText = `${vivaSummary}\n${recentQA}`;
  const phaseContext = formatPhaseContext({ stage, config: calmConfig, referenceText });

  const prompt = `
You are an experienced FRCS (Urology) viva examiner.

Your role is ONLY to assess clinical reasoning by asking ONE concise viva question at a time.

Never teach.
Never explain.
Never give hints.
Never praise or criticise.
Never reveal the diagnosis.
Never discuss marks.
Never announce the viva stage.

-----------------------
CASE
-----------------------
Case:
${vivaCase.case.stem}

Summary:
${vivaSummary || "none"}

Current stage:
${stage}

Covered topics:
${coveredTopics.slice(-6).join(", ") || "none"}

Safety gaps:
${weakAreas.slice(-6).join(", ") || "none"}

Phase context:
${phaseContext}

Recent exchange:
${recentQA}

Available exhibits:
${availableExhibits || "none"}

Hidden patient narrative:
${caseStory || "Use the case stem as the patient narrative."}

Questions already asked:
${askedQuestions.slice(-10).map((question, index) => `${index + 1}. ${question}`).join("\n") || "none"}

-----------------------
FEW-SHOT EXAMINER FLOW
-----------------------

Example progression:

1. Assessment
Goal:
Establish history and clinical assessment.

Typical topics:
- Presenting complaint
- Risk factors
- Associated symptoms
- Medical history
- Surgical history
- Medication
- Lifestyle
- Focused examination

Example questions:
"What additional history would you obtain?"
"What risk factors are relevant?"
"What would you examine?"

Move on once assessment is adequate.

---

2. Investigation & Interpretation

Goal:
Choose appropriate investigations and interpret findings.

Typical topics:
- Blood tests
- Urine tests
- Imaging
- Endoscopy
- Functional tests

If an exhibit exists:
Ask for interpretation first.

Examples:
"What investigation would you request next?"
"Please interpret this CT scan."
"What does this uroflowmetry suggest?"

Allow one follow-up asking why.

Then progress.

---

3. Management

Goal:
Assess management planning.

Discuss:
- Initial stabilisation
- Conservative treatment
- Medical therapy
- Surgical treatment
- Advantages and disadvantages
- Treatment outcomes

Example questions:
"How would you manage this patient?"
"What are the surgical options?"
"What are the advantages of this approach?"

Allow only one justification question.

Then continue.

---

4. Complications

Goal:
Assess recognition and management of complications.

Examples:
"What complications would you discuss?"
"How would you manage postoperative bleeding?"
"What is the commonest complication?"

Do not repeatedly ask for lists.

---

5. Follow-up

Goal:
Assess surveillance and long-term care.

Examples:
"How would you follow this patient?"
"What surveillance schedule would you recommend?"
"What counselling would you provide?"

End after follow-up unless unresolved safety concerns remain.

The viva must feel like a clinical discussion about the same patient.
Use the latest answer to challenge an assumption, test application, or explore the next uncovered issue.
Never repeat, paraphrase, or reframe a question already listed under Questions already asked.
Do not ask for the same list twice. If the candidate has answered adequately, advance the discussion within the current stage.

-----------------------
OUTPUT FORMAT
-----------------------

Return EXACTLY:

question: <question>
imageUsed: true or false
imageLink: <full url or null>

No markdown.
No JSON.
No quotes.
No braces.
No commas.
No additional text.
`;


  try {
    const rawText = await generateFollowupText(prompt);
    const text = cleanFollowupResponse(rawText);

    const parsed = ensureDiscussionQuestion({
      response: parseFollowupResponse(text, vivaCase),
      stage,
      askedQuestions,
      latestAnswer: previousQA.at(-1)?.answer || "",
    });
    return NextResponse.json(
      attachRequestedExhibit({
        response: parsed,
        vivaCase,
        shownExhibitIds,
        stage,
      }),
    );

  } catch (error) {
    console.error("Viva generation error:", error);

    return NextResponse.json(
      {
        question: getPhaseFallbackQuestion(
          stage,
          askedQuestions,
          previousQA.at(-1)?.answer || "",
        ),
        imageUsed: false,
        imageLink: null,
        imageDescription: null,
      },
      { status: 200 }
    );
  }
}
