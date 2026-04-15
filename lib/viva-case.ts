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
};

function toSlug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "exhibit";
}

function normalizeExhibit(exhibit: any, index: number) {
  const label = exhibit?.label || `Exhibit ${index + 1}`;
  const file = typeof exhibit?.file === "string" ? exhibit.file : undefined;
  const url = typeof exhibit?.url === "string" ? exhibit.url : undefined;

  return {
    id: exhibit?.id || `${toSlug(label)}-${index + 1}`,
    kind: exhibit?.kind || "image",
    label,
    url,
    file,
    description: exhibit?.description || "",
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

export function normalizeVivaCase(payload: any): VivaCaseRecord {
  const source = payload?.case?.case ? payload.case : payload;
  const fallback = getDefaultVivaCase();

  if (!source || typeof source !== "object") {
    return fallback;
  }

  return {
    id: source.id || fallback.id,
    case: {
      title: source.case?.title || source.title || fallback.case.title,
      level: source.case?.level || source.level || fallback.case.level,
      stem: source.case?.stem || source.stem || fallback.case.stem,
      objectives: source.case?.objectives || source.objectives || fallback.case.objectives,
    },
    exhibits: Array.isArray(source.exhibits)
      ? source.exhibits.map((exhibit: any, index: number) => normalizeExhibit(exhibit, index))
      : fallback.exhibits,
    marking_criteria: {
      must_mention:
        source.marking_criteria?.must_mention || fallback.marking_criteria.must_mention,
      critical_fail:
        source.marking_criteria?.critical_fail || fallback.marking_criteria.critical_fail,
    },
    viva_rules: {
      ...fallback.viva_rules,
      ...(source.viva_rules || {}),
    },
    attemptsCount: source.attemptsCount,
    attempts: source.attempts,
    allowedUser: source.allowedUser,
  };
}

export async function fetchRemoteVivaCases(): Promise<VivaCaseRecord[]> {
  const res = await fetch(REMOTE_VIVA_CASES_URL, {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("Failed to fetch viva cases");
  }

  const data = await res.json();
  const cases = Array.isArray(data?.cases) ? data.cases : Array.isArray(data) ? data : [];

  return cases.map((item: any) => normalizeVivaCase(item));
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

  const data = await res.json();
  return normalizeVivaCase(data?.case || data);
}
