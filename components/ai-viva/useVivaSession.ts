// "use client"

// import { useRef } from "react";

// export function useVivaSession() {
//   const sessionIdRef = useRef(crypto.randomUUID());

//   async function next(userAnswer: string) {
//     const res = await fetch("/api/viva/next", {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({
//         sessionId: sessionIdRef.current,
//         userAnswer,
//         timeElapsedSec: 0
//       })
//     });

//     return res.json();
//   }

//   return { next };
// }

"use client";
// import { useRef, useState } from "react";
// import { vivaContext } from "@/ai-viva-data/vivaContext";

// export function useVivaSession() {
//   const sessionIdRef = useRef(crypto.randomUUID());

//   const previousQARef = useRef<
//     { question: string; answer: string }[]
//   >([]);

//   const imageDetailsRef = useRef(
//     vivaContext.exhibits.map((e) => ({
//       image_name: e.id,
//       image_description: e.description,
//       available: true,
//     }))
//   );

//   async function next(userAnswer: string) {
//     // Save previous answer
//     if (previousQARef.current.length > 0 && userAnswer) {
//       previousQARef.current[
//         previousQARef.current.length - 1
//       ].answer = userAnswer;
//     }

//     const res = await fetch("/api/viva/generateFollowup", {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({
//         previousQA: previousQARef.current,
//         imageDetails: imageDetailsRef.current,
//         imageQuestionAsked: false,
//       }),
//     });

//     const data = await res.json();

//     // Save new question
//     if (data.question) {
//       previousQARef.current.push({
//         question: data.question,
//         answer: "",
//       });
//     }

//     return {
//       text: data.question,
//       imageDetails: data.imageDetails,
//     };
//   }

//   return { next };
// }


import { useState } from "react";

export type VivaExhibit =
  | {
      type: "image";
      src: string;
      description?: string;
    }
  | null;

type VivaApiResponse = {
  question?: string;
  imageUsed?: boolean;
  imageLink?: string | null;
  imageDescription?: string | null;
};

export function useVivaSession() {
  const [transcript, setTranscript] = useState("");
  const [speaking, setSpeaking] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [exhibit, setExhibit] = useState<VivaExhibit>(null);

  function applyApiResponse(data: VivaApiResponse) {
    if (!data?.question) return;

    setTranscript(data.question);
    setSpeaking(true);

    if (data.imageUsed && data.imageLink) {
      setExhibit({
        type: "image",
        src: data.imageLink,
        description: data.imageDescription ?? undefined,
      });
    } else {
      setExhibit(null);
    }
  }

  function markSpeechEnded() {
    setSpeaking(false);
  }

  function clearExhibit() {
    setExhibit(null);
  }

  return {
    transcript,
    speaking,
    thinking,
    exhibit,
    setThinking,
    applyApiResponse,
    markSpeechEnded,
    clearExhibit,
  };
}
