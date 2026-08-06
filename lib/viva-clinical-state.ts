import type { ActiveCalmVivaPhase } from "@/lib/viva-flow";

export type DiscussionAction =
  | "clarify"
  | "challenge"
  | "justify"
  | "apply_new_fact"
  | "compare_options"
  | "prioritise"
  | "advance_topic";

export type ClinicalAnswerEvaluation = {
  addressedTopics: string[];
  correctClaims: string[];
  incompleteClaims: string[];
  incorrectClaims: string[];
  unsafeClaims: string[];
  candidatePlan: string[];
  workingDiagnosis?: string;
  nextDiscussionTarget?: string;
  recommendedAction: DiscussionAction;
  answerAdequate: boolean;
};

export type VivaClinicalState = {
  coveredTopics: string[];
  incompleteClaims: string[];
  incorrectClaims: string[];
  unsafeClaims: string[];
  candidatePlan: string[];
  workingDiagnosis?: string;
  nextDiscussionTarget?: string;
  recommendedAction: DiscussionAction;
  resolvedIntents: string[];
};

export const EMPTY_CLINICAL_STATE: VivaClinicalState = {
  coveredTopics: [],
  incompleteClaims: [],
  incorrectClaims: [],
  unsafeClaims: [],
  candidatePlan: [],
  recommendedAction: "advance_topic",
  resolvedIntents: [],
};

function strings(value: unknown, max = 12) {
  return Array.isArray(value)
    ? [...new Set(value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean))].slice(-max)
    : [];
}

export function normalizeClinicalEvaluation(value: unknown): ClinicalAnswerEvaluation {
  const source = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const validActions: DiscussionAction[] = ["clarify", "challenge", "justify", "apply_new_fact", "compare_options", "prioritise", "advance_topic"];
  const recommendedAction = validActions.includes(source.recommendedAction as DiscussionAction)
    ? source.recommendedAction as DiscussionAction
    : "clarify";
  return {
    addressedTopics: strings(source.addressedTopics),
    correctClaims: strings(source.correctClaims),
    incompleteClaims: strings(source.incompleteClaims),
    incorrectClaims: strings(source.incorrectClaims),
    unsafeClaims: strings(source.unsafeClaims),
    candidatePlan: strings(source.candidatePlan),
    workingDiagnosis: typeof source.workingDiagnosis === "string" ? source.workingDiagnosis.trim() || undefined : undefined,
    nextDiscussionTarget: typeof source.nextDiscussionTarget === "string" ? source.nextDiscussionTarget.trim() || undefined : undefined,
    recommendedAction,
    answerAdequate: source.answerAdequate === true,
  };
}

export function mergeClinicalState(
  current: VivaClinicalState,
  evaluation: ClinicalAnswerEvaluation,
): VivaClinicalState {
  const merge = (...groups: string[][]) => [...new Set(groups.flat().map((item) => item.trim()).filter(Boolean))].slice(-16);
  return {
    coveredTopics: merge(current.coveredTopics, evaluation.addressedTopics),
    incompleteClaims: evaluation.incompleteClaims,
    incorrectClaims: evaluation.incorrectClaims,
    unsafeClaims: evaluation.unsafeClaims,
    candidatePlan: merge(current.candidatePlan, evaluation.candidatePlan),
    workingDiagnosis: evaluation.workingDiagnosis || current.workingDiagnosis,
    nextDiscussionTarget: evaluation.nextDiscussionTarget,
    recommendedAction: evaluation.recommendedAction,
    resolvedIntents: evaluation.answerAdequate
      ? merge(current.resolvedIntents, evaluation.addressedTopics)
      : current.resolvedIntents,
  };
}

export function getDeterministicDiscussionInstruction(
  stage: ActiveCalmVivaPhase,
  state: VivaClinicalState,
) {
  if (state.unsafeClaims.length) {
    return `CHALLENGE the safety issue: ${state.unsafeClaims[0]}. Ask how the candidate would make the plan safe.`;
  }
  if (state.incorrectClaims.length) {
    return `CHALLENGE this claim without teaching the answer: ${state.incorrectClaims[0]}.`;
  }
  if (state.incompleteClaims.length) {
    return `CLARIFY the most important missing element: ${state.incompleteClaims[0]}. Do not ask for the entire list again.`;
  }
  if (state.nextDiscussionTarget) {
    return `${state.recommendedAction.toUpperCase()} the candidate on: ${state.nextDiscussionTarget}.`;
  }
  const defaults: Record<ActiveCalmVivaPhase, string> = {
    assessment: "Advance to the next uncovered patient-specific assessment issue.",
    investigations: "Discuss how the available findings change the working diagnosis or risk assessment.",
    management: "Test application by comparing options or adapting treatment to this patient.",
    complications: "Explore recognition, incidence, prevention, or management of one relevant complication.",
    follow_up: "Explore a patient-specific surveillance or safety-netting decision.",
  };
  return defaults[stage];
}
