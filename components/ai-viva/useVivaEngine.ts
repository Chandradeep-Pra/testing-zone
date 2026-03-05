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

type VivaMemory = {
  topicsCovered: string[];
  currentTopic: string | null;
  weaknesses: string[];
  difficulty: number;
};

const TOPIC_FLOW = [
  "history",
  "investigations",
  "interpretation",
  "management",
  "complications",
];

function detectExit(text: string) {
  if (!text) return false;

  const t = text.toLowerCase();

  const exitWords = [
    "end viva",
    "exit viva",
    "stop viva",
    "finish viva",
    "end the viva",
  ];

  return exitWords.some((w) => t.includes(w));
}

export function useVivaEngine() {

  const previousQARef = useRef<QA[]>([]);

  const memoryRef = useRef<VivaMemory>({
    topicsCovered: [],
    currentTopic: null,
    weaknesses: [],
    difficulty: 1,
  });

  function getNextTopic() {

    const mem = memoryRef.current;

    const next = TOPIC_FLOW.find(
      (t) => !mem.topicsCovered.includes(t)
    );

    return next || "management";
  }

  async function next(
    userAnswer: string,
    exit = false
  ): Promise<VivaApiResponse> {

    /* -----------------------------
       Save candidate answer
    ----------------------------- */

    if (previousQARef.current.length > 0 && userAnswer) {

      previousQARef.current[
        previousQARef.current.length - 1
      ].answer = userAnswer;

    }

    /* -----------------------------
       Detect exit command
    ----------------------------- */

    if (detectExit(userAnswer)) {

      return {
        exit: true,
      };

    }

    /* -----------------------------
       Determine next topic
    ----------------------------- */

    const nextTopic = getNextTopic();

    memoryRef.current.currentTopic = nextTopic;

    /* -----------------------------
       Call API
    ----------------------------- */

    const res = await fetch("/api/viva/generateFollowup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        previousQA: previousQARef.current,
        topic: nextTopic,
        memory: memoryRef.current,
        exit,
      }),
    });

    const data = await res.json();

    /* -----------------------------
       Update engine memory
    ----------------------------- */

    if (data.question) {

      if (!memoryRef.current.topicsCovered.includes(nextTopic)) {

        memoryRef.current.topicsCovered.push(nextTopic);

      }

      previousQARef.current.push({
        question: data.question,
        answer: "",
      });

    }

    return data;
  }

  return { next };

}