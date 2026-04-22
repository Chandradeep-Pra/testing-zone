"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";

import type { VivaCaseRecord, VivaModeQuestion } from "@/lib/viva-case";

type QA = { question: string; answer: string };
type VivaMode = "calm" | "fast";

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

function getFastModeQuestions(vivaCase: VivaCaseRecord): VivaModeQuestion[] {
  return vivaCase.modes?.fastAndFurious?.questions || [];
}

function getFastModeExhibit(vivaCase: VivaCaseRecord, question: VivaModeQuestion) {
  const linkedExhibitId = question.linkedExhibitIds?.[0];

  if (linkedExhibitId) {
    return vivaCase.exhibits.find((exhibit) => exhibit.id === linkedExhibitId) || null;
  }

  if (
    vivaCase.exhibits.length === 1 &&
    /\bimage\b|\bshown\b|\bpicture\b|\bprocedure\b/i.test(question.question)
  ) {
    return vivaCase.exhibits[0];
  }

  return null;
}

export function useVivaEngine(vivaCase: VivaCaseRecord, selectedMode: VivaMode = "calm") {
  const previousQARef = useRef<QA[]>([]);
  const shownExhibitIdsRef = useRef<Set<string>>(new Set());
  const fastQuestionIndexRef = useRef(0);
  const router = useRouter();

  function getCurrentFastQuestionIndex() {
    return fastQuestionIndexRef.current;
  }

  function getCurrentFastQuestion() {
    return getFastModeQuestions(vivaCase)[fastQuestionIndexRef.current] || null;
  }

  function doesAnswerMatchCurrentFastQuestion(answer: string) {
    if (selectedMode !== "fast") {
      return false;
    }

    const currentQuestion = getCurrentFastQuestion();
    if (!currentQuestion) {
      return false;
    }

    const normalizedAnswer = normalizeKeyword(answer);
    if (!normalizedAnswer) {
      return false;
    }

    return currentQuestion.answerKeywords.some((keyword) => {
      const normalizedKeyword = normalizeKeyword(keyword);
      return normalizedKeyword && normalizedAnswer.includes(normalizedKeyword);
    });
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
    const recentHistory = exit ? history : history.slice(-2);

    if (history.length > 0 && userAnswer) {
      history[history.length - 1].answer = userAnswer;
    }

    const res = await fetch("/api/viva/generateFollowup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        previousQA: recentHistory,
        shownExhibitIds: Array.from(shownExhibitIdsRef.current),
        vivaCase,
        exit,
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
    doesAnswerMatchCurrentFastQuestion,
  };
}
