import { vivaContext } from "@/ai-viva-data/vivaContext";

const REMOTE_VIVA_CASES_URL = "https://urocms.vercel.app/api/viva-cases";

export type VivaCaseAttempt = {
  candidate?: {
    name?: string;
    email?: string;
  };
  report?: {
    score?: number;
  };
};

export type VivaModeQuestion = {
  id: string;
  question: string;
  answerKeywords: string[];
  linkedExhibitIds: string[];
};

export type VivaCaseModes = {
  calmAndComposed?: {
    enabled?: boolean;
  };
  fastAndFurious?: {
    enabled?: boolean;
    questionCount?: number;
    questions?: VivaModeQuestion[];
  };
};

export type VivaCaseRecord = {
  id: string;
  case: {
    title: string;
    level: string;
    stem: string;
    objectives: string[];
  };
  exhibits: Array<{
    id: string;
    kind: string;
    label: string;
    url?: string;
    file?: string;
    description: string;
  }>;
  marking_criteria: {
    must_mention: string[];
    critical_fail: string[];
  };
  viva_rules: {
    max_duration_minutes: number;
    max_questions: number;
    question_style: string;
    allow_candidate_request: boolean;
    examiner_tone: string;
    progression: string;
  };
  attemptsCount?: number;
  attempts?: VivaCaseAttempt[];
  allowedUser?: string[];
  modes?: VivaCaseModes;
};

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord | null {
  return typeof value === "object" && value !== null ? (value as UnknownRecord) : null;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function toSlug(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "exhibit"
  );
}

function normalizeExhibit(exhibit: unknown, index: number) {
  const source = asRecord(exhibit);
  const label = typeof source?.label === "string" ? source.label : `Exhibit ${index + 1}`;
  const file = typeof source?.file === "string" ? source.file : undefined;
  const url = typeof source?.url === "string" ? source.url : undefined;

  return {
    id: typeof source?.id === "string" ? source.id : `${toSlug(label)}-${index + 1}`,
    kind: typeof source?.kind === "string" ? source.kind : "image",
    label,
    url,
    file,
    description: typeof source?.description === "string" ? source.description : "",
  };
}

function normalizeModeQuestion(question: unknown, index: number): VivaModeQuestion {
  const source = asRecord(question);

  return {
    id: typeof source?.id === "string" ? source.id : `question-${index + 1}`,
    question: typeof source?.question === "string" ? source.question : "",
    answerKeywords: asStringArray(source?.answerKeywords),
    linkedExhibitIds: asStringArray(source?.linkedExhibitIds),
  };
}

function normalizeModes(modes: unknown): VivaCaseModes | undefined {
  const source = asRecord(modes);
  if (!source) {
    return undefined;
  }

  const calmAndComposed = asRecord(source.calmAndComposed);
  const fastAndFurious = asRecord(source.fastAndFurious);

  return {
    calmAndComposed: calmAndComposed
      ? {
          enabled: Boolean(calmAndComposed.enabled),
        }
      : undefined,
    fastAndFurious: fastAndFurious
      ? {
          enabled: Boolean(fastAndFurious.enabled),
          questionCount:
            typeof fastAndFurious.questionCount === "number"
              ? fastAndFurious.questionCount
              : undefined,
          questions: Array.isArray(fastAndFurious.questions)
            ? fastAndFurious.questions.map((question, index) =>
                normalizeModeQuestion(question, index)
              )
            : [],
        }
      : undefined,
  };
}

export function getDefaultVivaCase(): VivaCaseRecord {
  return {
    id: vivaContext.case.id,
    case: {
      title: vivaContext.case.title,
      level: vivaContext.case.level,
      stem: vivaContext.case.stem,
      objectives: vivaContext.case.objectives || [],
    },
    exhibits: (vivaContext.exhibits || []).map((exhibit, index) =>
      normalizeExhibit(exhibit, index)
    ),
    marking_criteria: {
      must_mention: vivaContext.marking_criteria?.must_mention || [],
      critical_fail: vivaContext.marking_criteria?.critical_fail || [],
    },
    viva_rules: {
      ...vivaContext.viva_rules,
    },
  };
}

export function normalizeVivaCase(payload: unknown): VivaCaseRecord {
  const payloadRecord = asRecord(payload);
  const nestedCase = asRecord(payloadRecord?.case);
  const source =
    nestedCase && asRecord(nestedCase.case) ? nestedCase : payloadRecord;
  const fallback = getDefaultVivaCase();

  if (!source) {
    return fallback;
  }

  const sourceCase = asRecord(source.case);
  const sourceMarkingCriteria = asRecord(source.marking_criteria);
  const sourceRules = asRecord(source.viva_rules);

  return {
    id: typeof source.id === "string" ? source.id : fallback.id,
    case: {
      title:
        typeof sourceCase?.title === "string"
          ? sourceCase.title
          : typeof source.title === "string"
          ? source.title
          : fallback.case.title,
      level:
        typeof sourceCase?.level === "string"
          ? sourceCase.level
          : typeof source.level === "string"
          ? source.level
          : fallback.case.level,
      stem:
        typeof sourceCase?.stem === "string"
          ? sourceCase.stem
          : typeof source.stem === "string"
          ? source.stem
          : fallback.case.stem,
      objectives:
        asStringArray(sourceCase?.objectives).length > 0
          ? asStringArray(sourceCase?.objectives)
          : asStringArray(source.objectives).length > 0
          ? asStringArray(source.objectives)
          : fallback.case.objectives,
    },
    exhibits: Array.isArray(source.exhibits)
      ? source.exhibits.map((exhibit, index) => normalizeExhibit(exhibit, index))
      : fallback.exhibits,
    marking_criteria: {
      must_mention:
        asStringArray(sourceMarkingCriteria?.must_mention).length > 0
          ? asStringArray(sourceMarkingCriteria?.must_mention)
          : fallback.marking_criteria.must_mention,
      critical_fail:
        asStringArray(sourceMarkingCriteria?.critical_fail).length > 0
          ? asStringArray(sourceMarkingCriteria?.critical_fail)
          : fallback.marking_criteria.critical_fail,
    },
    viva_rules: {
      ...fallback.viva_rules,
      ...(sourceRules
        ? {
            ...sourceRules,
          }
        : {}),
    },
    attemptsCount:
      typeof source.attemptsCount === "number" ? source.attemptsCount : undefined,
    attempts: Array.isArray(source.attempts)
      ? (source.attempts as VivaCaseAttempt[])
      : undefined,
    allowedUser: asStringArray(source.allowedUser),
    modes: normalizeModes(source.modes),
  };
}

export async function fetchRemoteVivaCases(): Promise<VivaCaseRecord[]> {
  const res = await fetch(REMOTE_VIVA_CASES_URL, {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("Failed to fetch viva cases");
  }

  const data = (await res.json()) as { cases?: unknown[] } | unknown[];
  const cases = Array.isArray((data as { cases?: unknown[] })?.cases)
    ? ((data as { cases?: unknown[] }).cases ?? [])
    : Array.isArray(data)
    ? data
    : [];

  return cases.map((item) => normalizeVivaCase(item));
}

export async function fetchRemoteVivaCaseById(id: string): Promise<VivaCaseRecord | null> {
  const res = await fetch(`${REMOTE_VIVA_CASES_URL}/${id}`, {
    cache: "no-store",
  });

  if (res.status === 404) {
    return null;
  }

  if (!res.ok) {
    throw new Error("Failed to fetch viva case");
  }

  const data = (await res.json()) as { case?: unknown } | unknown;
  return normalizeVivaCase(asRecord(data)?.case ?? data);
}
