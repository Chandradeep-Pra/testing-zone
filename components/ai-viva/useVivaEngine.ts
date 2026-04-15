"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";

import type { VivaCaseRecord } from "@/lib/viva-case";

type QA = { question: string; answer: string };

export type VivaApiResponse = {
  question?: string;
  imageUsed?: boolean;
  imageLink?: string | null;
  imageDescription?: string | null;
  imageId?: string | null;
  evaluation?: unknown;
  exit?: boolean;
};

export function useVivaEngine(vivaCase: VivaCaseRecord) {
  const previousQARef = useRef<QA[]>([]);
  const shownExhibitIdsRef = useRef<Set<string>>(new Set());
  const router = useRouter();

  async function next(userAnswer: string, exit = false): Promise<VivaApiResponse> {
    try {
      const history = previousQARef.current;

      // attach answer to last question
      if (history.length > 0 && userAnswer) {
        history[history.length - 1].answer = userAnswer;
      }

      const res = await fetch("/api/viva/generateFollowup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          previousQA: history,
          shownExhibitIds: Array.from(shownExhibitIdsRef.current),
          vivaCase,
          exit,
        }),
      });

      console.log("Api response to be spoken by AI : ")

      if (!res.ok) {
        throw new Error("API error");
      }

      const data: VivaApiResponse = await res.json();

      // Track any exhibit that was shown in this response
      if (data.imageUsed && data.imageId) {
        shownExhibitIdsRef.current.add(data.imageId);
      }

      // push next question
      if (!exit && data?.question) {
        history.push({
          question: data.question,
          answer: "",
        });
      }

      return data;

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

      // store for ReviewPage
      sessionStorage.setItem(
        "viva-final-score",
        JSON.stringify(data)
      );

      // move to score page
      router.push("/ai-viva/score");

    } catch (err) {
      console.error("Score generation error:", err);
    }
  }

  function reset() {
    previousQARef.current = [];
  }

  function getHistory() {
    return previousQARef.current;
  }

  return {
    next,
    generateScore,
    reset,
    getHistory,
  };
}