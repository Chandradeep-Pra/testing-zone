export const CALM_VIVA_PHASES = [
  "assessment",
  "investigations",
  "management",
  "complications",
  "follow_up",
] as const;

export type ActiveCalmVivaPhase = (typeof CALM_VIVA_PHASES)[number];
export type CalmVivaPhase = ActiveCalmVivaPhase | "complete";

export type CalmVivaState = {
  phase: CalmVivaPhase;
  phaseQuestionCount: number;
  totalQuestionCount: number;
  coveredTopics: string[];
  missedCriticalTopics: string[];
  requestedInvestigationIds: string[];
  shownExhibitIds: string[];
  candidateDiagnosis?: string;
  candidateTreatment?: string;
  pendingJustification?: string;
  summary: string;
};

export type CalmAnswerEvaluation = {
  coveredTopics: string[];
  missedCriticalTopics: string[];
  candidateDiagnosis?: string;
  candidateTreatment?: string;
  requestedInvestigationId?: string;
  needsJustification?: boolean;
  phaseAdequate?: boolean;
  unsafe?: boolean;
};

export type CalmPhaseConfigLike = {
  objectives: string[];
  criticalTopics: string[];
  maxPrimaryQuestions?: number;
};

export const CALM_VIVA_TOTAL_DURATION_SEC = 10 * 60;

export const PHASE_DURATION_SEC: Record<ActiveCalmVivaPhase, number> = {
  assessment: 90,
  investigations: 180,
  management: 240,
  complications: 60,
  follow_up: 30,
};

export const PHASE_TIME_SHARES: Record<ActiveCalmVivaPhase, number> = {
  assessment: PHASE_DURATION_SEC.assessment / CALM_VIVA_TOTAL_DURATION_SEC,
  investigations: PHASE_DURATION_SEC.investigations / CALM_VIVA_TOTAL_DURATION_SEC,
  management: PHASE_DURATION_SEC.management / CALM_VIVA_TOTAL_DURATION_SEC,
  complications: PHASE_DURATION_SEC.complications / CALM_VIVA_TOTAL_DURATION_SEC,
  follow_up: PHASE_DURATION_SEC.follow_up / CALM_VIVA_TOTAL_DURATION_SEC,
};

export const CALM_PHASE_GUIDANCE: Record<
  ActiveCalmVivaPhase,
  { title: string; shortTime: string; explainer: string; prompts: string[] }
> = {
  assessment: {
    title: "Assessment",
    shortTime: "1 min 30 sec",
    explainer: "Take a focused history covering the key clinical domains, then describe the relevant examination.",
    prompts: ["Symptoms", "Risk factors", "Associated symptoms", "Medical and surgical history", "Relevant examination"],
  },
  investigations: {
    title: "Investigation and Interpretation",
    shortTime: "3 min",
    explainer: "Describe the investigation findings and explain what diagnoses or possibilities they suggest.",
    prompts: ["Findings on the supplied image", "Case-relevant blood, urine or other tests when no image is available", "Interpretation of each result", "Likely diagnosis and differential possibilities"],
  },
  management: {
    title: "Management",
    shortTime: "4 min",
    explainer: "Discuss a case-relevant treatment plan, compare alternatives, and explain expected outcomes.",
    prompts: ["Medical treatment", "Lifestyle changes", "Surgical treatment when relevant", "Advantages and disadvantages of alternatives", "Treatment outcomes"],
  },
  complications: {
    title: "Complications",
    shortTime: "1 min",
    explainer: "State important treatment complications with their approximate incidence, then explain how each would be treated.",
    prompts: ["Treatment-related complication", "Approximate percentage or incidence", "Recognition and assessment", "Medical management", "Surgical management when required"],
  },
  follow_up: {
    title: "Follow Up",
    shortTime: "30 sec",
    explainer: "Set out when and how the patient will be reviewed after treatment.",
    prompts: ["Review interval", "Symptoms, tests or imaging to monitor", "Safety-net advice and triggers for earlier review"],
  },
};

export function getCalmPhaseAtElapsedSec(elapsedSec: number): ActiveCalmVivaPhase {
  let boundary = 0;
  for (const phase of CALM_VIVA_PHASES) {
    boundary += PHASE_DURATION_SEC[phase];
    if (elapsedSec < boundary) return phase;
  }
  return "follow_up";
}

export function getCalmPhaseTiming(elapsedSec: number) {
  const phase = getCalmPhaseAtElapsedSec(elapsedSec);
  const phaseIndex = CALM_VIVA_PHASES.indexOf(phase);
  const startedAt = CALM_VIVA_PHASES.slice(0, phaseIndex).reduce(
    (total, item) => total + PHASE_DURATION_SEC[item],
    0,
  );
  return {
    phase,
    elapsedInPhaseSec: Math.max(0, elapsedSec - startedAt),
    remainingInPhaseSec: Math.max(0, PHASE_DURATION_SEC[phase] - (elapsedSec - startedAt)),
  };
}

export function createInitialCalmVivaState(): CalmVivaState {
  return {
    phase: "assessment",
    phaseQuestionCount: 0,
    totalQuestionCount: 0,
    coveredTopics: [],
    missedCriticalTopics: [],
    requestedInvestigationIds: [],
    shownExhibitIds: [],
    summary: "",
  };
}

export function isActiveCalmPhase(value: unknown): value is ActiveCalmVivaPhase {
  return CALM_VIVA_PHASES.includes(value as ActiveCalmVivaPhase);
}

export function normalizeCalmVivaState(value: unknown): CalmVivaState {
  if (!value || typeof value !== "object") {
    return createInitialCalmVivaState();
  }

  const source = value as Partial<CalmVivaState>;
  const phase =
    source.phase === "complete" || isActiveCalmPhase(source.phase)
      ? source.phase
      : "assessment";
  const strings = (items: unknown) =>
    Array.isArray(items)
      ? [...new Set(items.filter((item): item is string => typeof item === "string" && Boolean(item.trim())))]
      : [];

  return {
    phase,
    phaseQuestionCount:
      typeof source.phaseQuestionCount === "number" && source.phaseQuestionCount >= 0
        ? Math.floor(source.phaseQuestionCount)
        : 0,
    totalQuestionCount:
      typeof source.totalQuestionCount === "number" && source.totalQuestionCount >= 0
        ? Math.floor(source.totalQuestionCount)
        : 0,
    coveredTopics: strings(source.coveredTopics),
    missedCriticalTopics: strings(source.missedCriticalTopics),
    requestedInvestigationIds: strings(source.requestedInvestigationIds),
    shownExhibitIds: strings(source.shownExhibitIds),
    candidateDiagnosis:
      typeof source.candidateDiagnosis === "string" ? source.candidateDiagnosis : undefined,
    candidateTreatment:
      typeof source.candidateTreatment === "string" ? source.candidateTreatment : undefined,
    pendingJustification:
      typeof source.pendingJustification === "string" ? source.pendingJustification : undefined,
    summary: typeof source.summary === "string" ? source.summary.slice(0, 500) : "",
  };
}

export function getNextCalmPhase(phase: CalmVivaPhase): CalmVivaPhase {
  if (phase === "complete") return "complete";
  const index = CALM_VIVA_PHASES.indexOf(phase);
  return CALM_VIVA_PHASES[index + 1] ?? "complete";
}

export function getPhaseSoftDeadlineSec(
  phase: ActiveCalmVivaPhase,
  totalDurationSec: number,
) {
  let cumulativeShare = 0;
  for (const candidate of CALM_VIVA_PHASES) {
    cumulativeShare += PHASE_TIME_SHARES[candidate];
    if (candidate === phase) break;
  }
  return Math.round(Math.max(60, totalDurationSec) * cumulativeShare);
}

export function shouldAdvanceCalmPhase(params: {
  phase: ActiveCalmVivaPhase;
  phaseConfig: CalmPhaseConfigLike;
  phaseQuestionCount: number;
  coveredTopics: string[];
  missedCriticalTopics: string[];
  phaseAdequate?: boolean;
  elapsedSec: number;
  totalDurationSec: number;
}) {
  const criticalSet = new Set(params.phaseConfig.criticalTopics.map((topic) => topic.toLowerCase()));
  const unresolvedCritical = params.missedCriticalTopics.some((topic) =>
    criticalSet.has(topic.toLowerCase()),
  );
  if (unresolvedCritical) return false;

  const objectiveSet = new Set(params.phaseConfig.objectives.map((topic) => topic.toLowerCase()));
  const coveredCount = params.coveredTopics.filter((topic) =>
    objectiveSet.has(topic.toLowerCase()),
  ).length;
  const coverageRatio = objectiveSet.size > 0 ? coveredCount / objectiveSet.size : 1;
  const questionBudget = Math.max(1, params.phaseConfig.maxPrimaryQuestions ?? 2);
  const timeExpired =
    params.elapsedSec >= getPhaseSoftDeadlineSec(params.phase, params.totalDurationSec);

  return Boolean(
    params.phaseAdequate ||
      coverageRatio >= 0.7 ||
      params.phaseQuestionCount >= questionBudget ||
      timeExpired,
  );
}

export function mergeUniqueStrings(...groups: string[][]) {
  return [...new Set(groups.flat().map((value) => value.trim()).filter(Boolean))];
}

export function advanceCalmState(state: CalmVivaState): CalmVivaState {
  return {
    ...state,
    phase: getNextCalmPhase(state.phase),
    phaseQuestionCount: 0,
    pendingJustification: undefined,
  };
}
