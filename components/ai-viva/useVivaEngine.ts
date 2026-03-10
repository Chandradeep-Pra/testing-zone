"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";

type QA = { question: string; answer: string };

export type VivaApiResponse = {
  question?: string;
  imageUsed?: boolean;
  imageLink?: string | null;
  imageDescription?: string | null;
  evaluation?: any;
  exit?: boolean;
};

export function useVivaEngine() {
  const previousQARef = useRef<QA[]>([]);
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
          exit,
        }),
      });

      if (!res.ok) {
        throw new Error("API error");
      }

      const data: VivaApiResponse = await res.json();

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
        }),
      });

      if (!res.ok) {
        throw new Error("Score API failed");
      }

      const data = await res.json();

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