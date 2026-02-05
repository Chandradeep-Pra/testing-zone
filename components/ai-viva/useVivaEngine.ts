import { useRef } from "react";

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

  async function next(userAnswer: string, exit = false): Promise<VivaApiResponse> {
  if (previousQARef.current.length > 0 && userAnswer) {
    previousQARef.current[
      previousQARef.current.length - 1
    ].answer = userAnswer;
  }

  const res = await fetch("/api/viva/generateFollowup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      previousQA: previousQARef.current,
      exit,
    }),
  });

  const data = await res.json();

  // ❗ ONLY push when NOT exiting
  if (!exit && data.question) {
    previousQARef.current.push({
      question: data.question,
      answer: "",
    });
  }

  return data;
}


  return { next };
}
