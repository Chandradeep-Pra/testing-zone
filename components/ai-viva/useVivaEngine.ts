"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";

import { appPath } from "@/lib/app-path";
import { getStoredAuth } from "@/lib/urologics-auth";
import type { VivaCaseRecord, VivaModeQuestion } from "@/lib/viva-case";
import { getCalmPhaseAtElapsedSec, type ActiveCalmVivaPhase } from "@/lib/viva-flow";
import { normalizeMedicalTerms, type MedicalTerm } from "@/lib/medical-terminology";

type QA = { question: string; answer: string };
type VivaMode = "calm" | "fast";
type VivaTurnState = {
  summary: string;
  currentStage: ActiveCalmVivaPhase;
  coveredTopics: string[];
  weakAreas: string[];
};

function compactTurnState(state: VivaTurnState): VivaTurnState {
  return {
    summary: state.summary.slice(0, 500),
    currentStage: state.currentStage,
    coveredTopics: state.coveredTopics.slice(-6),
    weakAreas: state.weakAreas.slice(-6),
  };
}

type CachedCalmQuestion = {
  stage: ActiveCalmVivaPhase;
  request: Promise<VivaApiResponse>;
};

type VivaScorePayload = Record<string, unknown> & {
  basic_knowledge?: { score?: unknown };
  higher_order_processing?: { score?: unknown };
  clinical_skills?: { score?: unknown };
  professionalism?: { score?: unknown };
  caseTitle?: string;
};

export type VivaApiResponse = {
  question?: string;
  imageUsed?: boolean;
  imageLink?: string | null;
  imageDescription?: string | null;
  imageId?: string | null;
  evaluation?: unknown;
  exit?: boolean;
};

function normalizeKeyword(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function stemToken(token: string) {
  return token
    .replace(/(ing|ed|es|s)$/i, "")
    .trim();
}

function tokenize(value: string) {
  return normalizeKeyword(value)
    .split(" ")
    .map((token) => stemToken(token))
    .filter(Boolean);
}

function getKeywordAlternatives(keyword: string) {
  return keyword
    .split(/\s*(?:\/|\||\bor\b|,)\s*/i)
    .map((option) => option.trim())
    .filter(Boolean);
}

function doesKeywordVariantMatch(answer: string, answerTokens: Set<string>, keyword: string) {
  const normalizedKeyword = normalizeKeyword(keyword);

  if (!normalizedKeyword) {
    return false;
  }

  const keywordTokens = tokenize(keyword);
  const tokenMatch =
    keywordTokens.length > 0 &&
    keywordTokens.every((token) => answerTokens.has(token));

  return normalizeKeyword(answer).includes(normalizedKeyword) || tokenMatch;
}

function getMatchedKeywords(answer: string, keywords: string[]) {
  const normalizedAnswer = normalizeKeyword(answer);
  const answerTokens = new Set(tokenize(answer));

  if (!normalizedAnswer) {
    return [];
  }

  return keywords.filter((keyword, index) => {
    const normalizedKeyword = normalizeKeyword(keyword);

    if (!normalizedKeyword) {
      return false;
    }

    const alternatives = getKeywordAlternatives(keyword);
    const keywordMatched = alternatives.some((variant) =>
      doesKeywordVariantMatch(normalizedAnswer, answerTokens, variant)
    );

    return (
      keywordMatched &&
      keywords.findIndex(
        (candidate) => normalizeKeyword(candidate) === normalizedKeyword
      ) === index
    );
  });
}

function getFastModeQuestions(vivaCase: VivaCaseRecord): VivaModeQuestion[] {
  return vivaCase.modes?.fastAndFurious?.questions || [];
}

function getFastModeExhibit(vivaCase: VivaCaseRecord, question: VivaModeQuestion) {
  const linkedExhibitId = question.linkedExhibitIds?.[0];

  if (linkedExhibitId) {
    return vivaCase.exhibits.find((exhibit) => exhibit.id === linkedExhibitId) || null;
  }

  return null;
}

function getOverallVivaScore(score: VivaScorePayload) {
  const domainScores = [
    score.basic_knowledge?.score,
    score.higher_order_processing?.score,
    score.clinical_skills?.score,
    score.professionalism?.score,
  ].filter((value): value is number => typeof value === "number");

  if (!domainScores.length) return null;

  return Math.min(
    8,
    Math.max(4, Math.ceil(domainScores.reduce((sum, value) => sum + value, 0) / domainScores.length))
  );
}

async function submitAuthenticatedVivaAttempt(params: {
  vivaCase: VivaCaseRecord;
  selectedMode: VivaMode;
  score: VivaScorePayload;
}) {
  const user = getStoredAuth();

  if (!user?.idToken) {
    return;
  }

  const durationMinutes =
    params.selectedMode === "fast" ? 10 : params.vivaCase.viva_rules?.max_duration_minutes || 10;

  const response = await fetch(appPath("/api/urologics/viva-attempts"), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${user.idToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      caseId: params.vivaCase.id,
      mode: params.selectedMode === "calm" ? "Calm and Composed" : "Fast and Furious",
      report: params.score,
      score: getOverallVivaScore(params.score),
      durationSeconds: durationMinutes * 60,
    }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload?.error || "Failed to save viva attempt");
  }
}

export function useVivaEngine(vivaCase: VivaCaseRecord, selectedMode: VivaMode = "calm") {
  const previousQARef = useRef<QA[]>([]);
  const shownExhibitIdsRef = useRef<Set<string>>(new Set());
  const fastQuestionIndexRef = useRef(0);
  const summaryUpdateInFlightRef = useRef(false);
  const pendingSummaryQARef = useRef<QA | null>(null);
  const calmStageQuestionCountRef = useRef(0);
  const cachedCalmQuestionRef = useRef<CachedCalmQuestion | null>(null);
  const calmCaseStoryRef = useRef("");
  const medicalTerminologyRef = useRef<MedicalTerm[]>([]);
  const vivaTurnStateRef = useRef<VivaTurnState>({
    summary: "",
    currentStage: "assessment",
    coveredTopics: [],
    weakAreas: [],
  });
  const router = useRouter();

  function getCurrentFastQuestionIndex() {
    return fastQuestionIndexRef.current;
  }

  function getCurrentFastQuestion() {
    const questions = getFastModeQuestions(vivaCase);
    const currentAskedIndex = Math.max(0, fastQuestionIndexRef.current - 1);

    return questions[currentAskedIndex] || questions[0] || null;
  }

  function getCurrentFastQuestionKeywordProgress(answer: string) {
    if (selectedMode !== "fast") {
      return {
        matchedKeywords: [],
        totalKeywords: 0,
        allMatched: false,
      };
    }

    const currentQuestion = getCurrentFastQuestion();
    if (!currentQuestion) {
      return {
        matchedKeywords: [],
        totalKeywords: 0,
        allMatched: false,
      };
    }

    const matchedKeywords = getMatchedKeywords(answer, currentQuestion.answerKeywords);
    const totalKeywords = currentQuestion.answerKeywords.filter(
      (keyword, index, allKeywords) =>
        normalizeKeyword(keyword) &&
        allKeywords.findIndex(
          (candidate) => normalizeKeyword(candidate) === normalizeKeyword(keyword)
        ) === index
    ).length;

    return {
      matchedKeywords,
      totalKeywords,
      allMatched: totalKeywords > 0 && matchedKeywords.length === totalKeywords,
    };
  }

  function doesAnswerMatchCurrentFastQuestion(answer: string) {
    return getCurrentFastQuestionKeywordProgress(answer).allMatched;
  }

  async function nextFast(userAnswer: string, exit = false): Promise<VivaApiResponse> {
    const history = previousQARef.current;

    if (history.length > 0) {
      history[history.length - 1].answer = userAnswer;
    }

    if (exit) {
      return { exit: true };
    }

    const questions = getFastModeQuestions(vivaCase);
    const currentQuestion = questions[fastQuestionIndexRef.current];

    if (!currentQuestion) {
      return { exit: true };
    }

    const linkedExhibit = getFastModeExhibit(vivaCase, currentQuestion);
    const imageLink = linkedExhibit
      ? linkedExhibit.url || (linkedExhibit.file ? `/exhibits/${linkedExhibit.file}` : null)
      : null;

    if (linkedExhibit?.id) {
      shownExhibitIdsRef.current.add(linkedExhibit.id);
    }

    history.push({
      question: currentQuestion.question,
      answer: "",
    });

    fastQuestionIndexRef.current += 1;

    return {
      question: currentQuestion.question,
      imageUsed: Boolean(imageLink),
      imageLink,
      imageDescription: linkedExhibit?.description || null,
      imageId: linkedExhibit?.id || null,
      exit: false,
    };
  }

  async function nextCalm(userAnswer: string, exit = false, elapsedSec = 0): Promise<VivaApiResponse> {
    const history = previousQARef.current;

    if (history.length > 0 && userAnswer) {
      history[history.length - 1].answer = userAnswer;
    }

    const latestAnsweredQA =
      !exit && history.length > 0 && userAnswer
        ? { ...history[history.length - 1] }
        : null;

    const timedStage = getCalmPhaseAtElapsedSec(elapsedSec);
    if (timedStage !== vivaTurnStateRef.current.currentStage) {
      vivaTurnStateRef.current = {
        ...vivaTurnStateRef.current,
        currentStage: timedStage,
      };
      calmStageQuestionCountRef.current = 0;
    }

    const currentTurnState = compactTurnState(vivaTurnStateRef.current);
    const recentHistory = exit ? history : history.slice(-1);
    const cachedQuestion = cachedCalmQuestionRef.current;
    const canUseCachedQuestion =
      !exit && cachedQuestion?.stage === currentTurnState.currentStage;
    let data: VivaApiResponse;
    if (canUseCachedQuestion) {
      try {
        data = await cachedQuestion.request;
      } catch {
        data = await requestCalmQuestion(currentTurnState, recentHistory, exit);
      }
    } else {
      data = await requestCalmQuestion(currentTurnState, recentHistory, exit);
    }

    if (canUseCachedQuestion) {
      cachedCalmQuestionRef.current = null;
    }

    if (data.imageUsed && data.imageId) {
      shownExhibitIdsRef.current.add(data.imageId);
    }

    if (!exit && data?.question) {
      history.push({
        question: data.question,
        answer: "",
      });
      calmStageQuestionCountRef.current += 1;
    }

    // Summary maintenance starts only after the next question has returned, so
    // it cannot compete with the latency-sensitive follow-up model request.
    if (latestAnsweredQA) {
      updateVivaSummaryInBackground(latestAnsweredQA, currentTurnState);
    }

    return data;
  }

  async function requestCalmQuestion(
    turnState: VivaTurnState,
    previousQA: QA[],
    exit = false,
  ): Promise<VivaApiResponse> {
    const res = await fetch(appPath("/api/viva/generateFollowup"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        previousQA,
        shownExhibitIds: Array.from(shownExhibitIdsRef.current),
        vivaCase,
        exit,
        vivaSummary: turnState.summary,
        currentStage: turnState.currentStage,
        coveredTopics: turnState.coveredTopics,
        weakAreas: turnState.weakAreas,
        caseStory: calmCaseStoryRef.current,
        askedQuestions: previousQARef.current.map((item) => item.question),
      }),
    });

    if (!res.ok) throw new Error("API error");
    return res.json();
  }

  function prefetchNextCalmPhase(elapsedSec: number) {
    if (selectedMode !== "calm") return;

    const stage = getCalmPhaseAtElapsedSec(elapsedSec);
    if (
      stage === vivaTurnStateRef.current.currentStage ||
      cachedCalmQuestionRef.current?.stage === stage
    ) {
      return;
    }

    const stateSnapshot = compactTurnState({
      ...vivaTurnStateRef.current,
      currentStage: stage,
    });
    // Include the active question so the API does not mistake this background
    // request for the first turn of a brand-new viva. Its answer may still be
    // blank; the question itself provides enough context for a phase transition.
    const activeQuestionContext = previousQARef.current.slice(-1).map((item) => ({
      ...item,
    }));
    if (!activeQuestionContext.length) return;

    const request = requestCalmQuestion(stateSnapshot, activeQuestionContext).catch((error) => {
      if (cachedCalmQuestionRef.current?.request === request) {
        cachedCalmQuestionRef.current = null;
      }
      throw error;
    });
    // Attach a rejection handler immediately because consumption may happen
    // after the network request has already failed.
    void request.catch(() => undefined);
    cachedCalmQuestionRef.current = { stage, request };
  }

  async function prepareCalmCase() {
    if (selectedMode !== "calm") return;
    const res = await fetch(appPath("/api/viva/prepareCase"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vivaCase }),
    });
    if (!res.ok) throw new Error("Case preparation failed");
    const data = (await res.json()) as { story?: unknown; terminology?: unknown };
    calmCaseStoryRef.current = typeof data.story === "string" ? data.story.slice(0, 6000) : "";
    medicalTerminologyRef.current = normalizeMedicalTerms(data.terminology);
  }

  function getMedicalTerminology() {
    return medicalTerminologyRef.current;
  }

  function updateVivaSummaryInBackground(latestQA: QA, stateSnapshot: VivaTurnState) {
    if (summaryUpdateInFlightRef.current) {
      pendingSummaryQARef.current = latestQA;
      return;
    }

    summaryUpdateInFlightRef.current = true;

    void fetch(appPath("/api/viva/updateSummary"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        previousSummary: stateSnapshot.summary.slice(0, 500),
        currentStage: stateSnapshot.currentStage,
        coveredTopics: stateSnapshot.coveredTopics.slice(-6),
        weakAreas: stateSnapshot.weakAreas.slice(-6),
        latestQA,
        vivaCase,
      }),
    })
      .then(async (res) => {
        if (!res.ok) {
          throw new Error("Summary API failed");
        }

        const data = (await res.json()) as Partial<VivaTurnState>;
        vivaTurnStateRef.current = {
          summary:
            typeof data.summary === "string"
              ? data.summary
              : vivaTurnStateRef.current.summary,
          // Stage progression is controlled locally by fixed question budgets.
          // The model maintains clinical memory but cannot trap or skip phases.
          currentStage: vivaTurnStateRef.current.currentStage,
          coveredTopics: Array.isArray(data.coveredTopics)
            ? data.coveredTopics.filter((item): item is string => typeof item === "string")
            : vivaTurnStateRef.current.coveredTopics,
          weakAreas: Array.isArray(data.weakAreas)
            ? data.weakAreas.filter((item): item is string => typeof item === "string")
            : vivaTurnStateRef.current.weakAreas,
        };
      })
      .catch((error) => {
        console.warn("Viva summary update skipped:", error);
      })
      .finally(() => {
        summaryUpdateInFlightRef.current = false;

        const pendingQA = pendingSummaryQARef.current;
        if (pendingQA) {
          pendingSummaryQARef.current = null;
          updateVivaSummaryInBackground(pendingQA, vivaTurnStateRef.current);
        }
      });
  }

  async function next(userAnswer: string, exit = false, elapsedSec = 0): Promise<VivaApiResponse> {
    try {
      if (selectedMode === "fast") {
        return await nextFast(userAnswer, exit);
      }

      return await nextCalm(userAnswer, exit, elapsedSec);
    } catch (err) {
      console.error("Viva engine error:", err);

      return {
        question: "Sorry, something went wrong generating the next question.",
      };
    }
  }

  async function generateScore() {
    try {
      const history = previousQARef.current;

      const res = await fetch(appPath("/api/viva/generateScore"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          previousQA: history,
          vivaCase,
        }),
      });

      if (!res.ok) {
        throw new Error("Score API failed");
      }

      const data = await res.json();

      if (!data.caseTitle) {
        data.caseTitle = vivaCase.case.title;
      }

      await submitAuthenticatedVivaAttempt({
        vivaCase,
        selectedMode,
        score: data,
      }).catch((error) => {
        console.warn("Viva attempt save failed:", error);
      });

      sessionStorage.setItem("viva-final-score", JSON.stringify(data));
      router.push("/ai-viva/score");
    } catch (err) {
      console.error("Score generation error:", err);
    }
  }

  function reset() {
    previousQARef.current = [];
    shownExhibitIdsRef.current = new Set();
    fastQuestionIndexRef.current = 0;
    summaryUpdateInFlightRef.current = false;
    pendingSummaryQARef.current = null;
    calmStageQuestionCountRef.current = 0;
    cachedCalmQuestionRef.current = null;
    calmCaseStoryRef.current = "";
    medicalTerminologyRef.current = [];
    vivaTurnStateRef.current = {
      summary: "",
      currentStage: "assessment",
      coveredTopics: [],
      weakAreas: [],
    };
  }

  function getHistory() {
    return previousQARef.current;
  }

  return {
    next,
    generateScore,
    reset,
    getHistory,
    getCurrentFastQuestionIndex,
    getCurrentFastQuestion,
    getCurrentFastQuestionKeywordProgress,
    doesAnswerMatchCurrentFastQuestion,
    prefetchNextCalmPhase,
    prepareCalmCase,
    getMedicalTerminology,
  };
}
