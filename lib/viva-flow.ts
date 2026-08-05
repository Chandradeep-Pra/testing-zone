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

export const PHASE_TIME_SHARES: Record<ActiveCalmVivaPhase, number> = {
  assessment: 0.2,
  investigations: 0.25,
  management: 0.3,
  complications: 0.15,
  follow_up: 0.1,
};

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
