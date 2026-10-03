export type SessionStartCandidate = {
  name?: string;
  email?: string;
};

export type SessionStartCaseData = {
  id?: string;
  title?: string;
  level?: string;
  stem?: string;
  objectives?: string[];
  exhibits?: Array<{
    id?: string;
    label?: string;
    kind?: string;
    file?: string;
    url?: string;
    description?: string;
  }>;
  viva_rules?: {
    max_duration_minutes?: number;
    max_questions?: number;
    question_style?: string;
    allow_candidate_request?: boolean;
    examiner_tone?: string;
    progression?: string;
  };
  marking_criteria?: {
    must_mention?: string[];
    critical_fail?: string[];
  };
};

export type SessionStartPayload = {
  type?: "session_start";
  candidate: {
    name: string;
    email: string;
  };
  case: SessionStartCaseData;
  meta?: {
    source?: string;
  };
};

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

export function normalizeSessionStartPayload(input: unknown): SessionStartPayload {
  const source = typeof input === "object" && input !== null ? (input as Record<string, unknown>) : {};
  const candidateSource = typeof source.candidate === "object" && source.candidate !== null ? (source.candidate as Record<string, unknown>) : {};
  const caseSource = typeof source.case === "object" && source.case !== null ? (source.case as Record<string, unknown>) : {};
  const caseDetails = typeof caseSource.case === "object" && caseSource.case !== null
    ? (caseSource.case as Record<string, unknown>)
    : caseSource;
  const rulesSource = typeof caseSource.viva_rules === "object" && caseSource.viva_rules !== null
    ? (caseSource.viva_rules as Record<string, unknown>)
    : {};
  const markingSource = typeof caseSource.marking_criteria === "object" && caseSource.marking_criteria !== null
    ? (caseSource.marking_criteria as Record<string, unknown>)
    : {};

  const name = asString(candidateSource.name).trim() || "candidate";
  const email = asString(candidateSource.email).trim();

  const normalizedCase: SessionStartCaseData = {
    id: asString(caseSource.id) || asString(source.id) || "case-default",
    title: asString(caseDetails.title) || asString(source.title) || "AI viva case",
    level: asString(caseDetails.level) || asString(source.level) || "Intermediate",
    stem: asString(caseDetails.stem) || asString(source.stem) || "",
    objectives: asStringArray(caseDetails.objectives).length
      ? asStringArray(caseDetails.objectives)
      : asStringArray(source.objectives),
    exhibits: Array.isArray(caseSource.exhibits)
      ? caseSource.exhibits.map((item) => {
          const exhibit = typeof item === "object" && item !== null ? (item as Record<string, unknown>) : {};
          return {
            id: asString(exhibit.id),
            label: asString(exhibit.label),
            kind: asString(exhibit.kind),
            file: asString(exhibit.file),
            url: asString(exhibit.url),
            description: asString(exhibit.description),
          };
        })
      : [],
    viva_rules: {
      max_duration_minutes: positiveNumber(rulesSource.max_duration_minutes, 10),
      max_questions: positiveNumber(rulesSource.max_questions, 10),
      question_style: asString(rulesSource.question_style) || "single_question_only",
      allow_candidate_request: typeof rulesSource.allow_candidate_request === "boolean" ? rulesSource.allow_candidate_request : true,
      examiner_tone: asString(rulesSource.examiner_tone) || "Formal, neutral, and concise",
      progression: asString(rulesSource.progression) || "Laddered",
    },
    marking_criteria: {
      must_mention: asStringArray(markingSource.must_mention),
      critical_fail: asStringArray(markingSource.critical_fail),
    },
  };

  return {
    type: "session_start",
    candidate: {
      name,
      email,
    },
    case: normalizedCase,
    meta:
      typeof source.meta === "object" && source.meta !== null
        ? {
            source: asString((source.meta as Record<string, unknown>).source),
          }
        : undefined,
  };
}

function positiveNumber(value: unknown, fallback: number): number {
  if (typeof value !== "number" && typeof value !== "string") return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function buildSessionStartPrompt(candidate: SessionStartCandidate, vivaCase: SessionStartCaseData): string {
  const safeCandidateName = (candidate.name || "candidate").trim() || "candidate";
  const safeCaseTitle = vivaCase.title || "AI viva case";
  const safeStem = vivaCase.stem || "No case stem provided.";
  const objectives = vivaCase.objectives?.length ? vivaCase.objectives : ["Assess the patient safely and clinically."];

  return [
    `Candidate name: ${safeCandidateName}`,
    `Candidate email: ${candidate.email?.trim() || "not provided"}`,
    `Case title: ${safeCaseTitle}`,
    `Case stem: ${safeStem}`,
    `Case objectives: ${objectives.join("; ")}`,
  ].join("\n");
}
