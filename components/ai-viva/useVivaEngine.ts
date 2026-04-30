"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";

import type { VivaCaseRecord, VivaModeQuestion } from "@/lib/viva-case";

type QA = { question: string; answer: string };
type VivaMode = "calm" | "fast";
type VivaStage =
  | "initial_assessment"
  | "investigations"
  | "interpretation"
  | "management"
  | "alternatives"
  | "complications"
  | "follow_up";

type VivaTurnState = {
  summary: string;
  currentStage: VivaStage;
  coveredTopics: string[];
  weakAreas: string[];
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

export function useVivaEngine(vivaCase: VivaCaseRecord, selectedMode: VivaMode = "calm") {
  const previousQARef = useRef<QA[]>([]);
  const shownExhibitIdsRef = useRef<Set<string>>(new Set());
  const fastQuestionIndexRef = useRef(0);
  const summaryUpdateInFlightRef = useRef(false);
  const pendingSummaryQARef = useRef<QA | null>(null);
  const vivaTurnStateRef = useRef<VivaTurnState>({
    summary: "",
    currentStage: "initial_assessment",
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

  async function nextCalm(userAnswer: string, exit = false): Promise<VivaApiResponse> {
    const history = previousQARef.current;

    if (history.length > 0 && userAnswer) {
      history[history.length - 1].answer = userAnswer;
    }

    const latestAnsweredQA =
      !exit && history.length > 0 && userAnswer
        ? { ...history[history.length - 1] }
        : null;
    const currentTurnState = vivaTurnStateRef.current;
    const recentHistory = exit ? history : history.slice(-1);

    if (latestAnsweredQA) {
      updateVivaSummaryInBackground(latestAnsweredQA, currentTurnState);
    }

    const res = await fetch("/api/viva/generateFollowup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        previousQA: recentHistory,
        shownExhibitIds: Array.from(shownExhibitIdsRef.current),
        vivaCase,
        exit,
        vivaSummary: currentTurnState.summary,
        currentStage: currentTurnState.currentStage,
        coveredTopics: currentTurnState.coveredTopics,
        weakAreas: currentTurnState.weakAreas,
      }),
    });

    if (!res.ok) {
      throw new Error("API error");
    }

    const data: VivaApiResponse = await res.json();

    if (data.imageUsed && data.imageId) {
      shownExhibitIdsRef.current.add(data.imageId);
    }

    if (!exit && data?.question) {
      history.push({
        question: data.question,
        answer: "",
      });
    }

    return data;
  }

  function updateVivaSummaryInBackground(latestQA: QA, stateSnapshot: VivaTurnState) {
    if (summaryUpdateInFlightRef.current) {
      pendingSummaryQARef.current = latestQA;
      return;
    }

    summaryUpdateInFlightRef.current = true;

    void fetch("/api/viva/updateSummary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        previousSummary: stateSnapshot.summary,
        currentStage: stateSnapshot.currentStage,
        coveredTopics: stateSnapshot.coveredTopics,
        weakAreas: stateSnapshot.weakAreas,
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
          currentStage:
            typeof data.currentStage === "string"
              ? (data.currentStage as VivaStage)
              : vivaTurnStateRef.current.currentStage,
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

  async function next(userAnswer: string, exit = false): Promise<VivaApiResponse> {
    try {
      if (selectedMode === "fast") {
        return await nextFast(userAnswer, exit);
      }

      return await nextCalm(userAnswer, exit);
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

      const res = await fetch("/api/viva/generateScore", {
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
    vivaTurnStateRef.current = {
      summary: "",
      currentStage: "initial_assessment",
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
  };
}
