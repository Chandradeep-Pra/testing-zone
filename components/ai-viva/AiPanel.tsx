//@ts-nocheck

"use client";

import React, { useEffect, useState } from "react";
import SiriWaveComponent from "./SiriWaveForm";

type Props = {
  speaking: boolean;
  thinking?: boolean;
  transcript: string;
  exhibit?: React.ReactNode;
  amplitude?: number;
  keywordDetected?: boolean;
};

// const fillers = [
//   "Alright, let me consider that.",
//   "Okay, I understand.",
//   "Hmm, let me think about that.",
//   "Got it, one moment.",
//   "Right, I see.",
//   "Okay, processing your response.",
//   "I understand what you're saying.",
//   "Alright, just a second.",
//   "Let me go through that.",
//   "Okay, thinking it through.",
//   "Right, let me consider your answer.",
//   "Understood, give me a moment.",
// ];

const fillers = [
  // "Alright, let me consider that.",
  // "Okay, I understand.",
  // "Hmm, let me think about that.",
  // "Got it, one moment.",
  // "Right, I see.",
  // "Okay, processing your response.",
  // "I understand what you're saying.",
  // "Alright, just a second.",
  // "Let me go through that.",
  // "Okay, thinking it through.",
  // "Right, let me consider your answer.",
  // "Understood, give me a moment.",
];
export function AiPanel({
  speaking,
  thinking = false,
  transcript,
  exhibit,
  amplitude = 0,
  keywordDetected = false,
}: Props) {
  const [filler, setFiller] = useState("");
  const activeExhibit = !speaking && !thinking ? exhibit : null;

  useEffect(() => {
    if (!thinking || speaking) {
      return;
    }

    let i = 0;
    const interval = setInterval(() => {
      setFiller(fillers[i % fillers.length]);
      i += 1;
    }, 1800);
    return () => {
      clearInterval(interval);
    };
  }, [thinking, speaking]);

  const statusText = speaking ? "Speaking" : thinking ? "Thinking" : "Listening";
  const visibleTranscript = thinking ? filler || fillers[0] : transcript;

  return (
    <div
      className={`relative h-full w-full rounded-xl border overflow-hidden bg-slate-950 transition-all duration-300 ${
        keywordDetected
          ? "border-orange-400 shadow-[0_0_32px_rgba(251,146,60,0.45)]"
          : speaking
          ? "border-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.35)]"
          : thinking
          ? "border-yellow-400 shadow-[0_0_30px_rgba(234,179,8,0.25)]"
          : "border-slate-800"
      }`}
    >
      <div className="absolute top-4 left-4 text-xs uppercase tracking-widest text-slate-400">
        AI Examiner
      </div>

      <div className="absolute top-4 right-4 text-xs">
        <span
          className={
            keywordDetected
              ? "text-orange-300"
              : speaking
              ? "text-emerald-400"
              : thinking
              ? "text-yellow-400"
              : "text-slate-400"
          }
        >
          {keywordDetected ? "Keyword Heard" : statusText}
        </span>
      </div>

      <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
        <div className="flex items-center justify-center scale-110">
          {thinking && <SiriWaveComponent amplitude={0.2} speed={0.02} />}
          {speaking && <SiriWaveComponent amplitude={amplitude} speed={0.08} />}
          {!thinking && !speaking && <SiriWaveComponent amplitude={0.1} speed={0.03} />}
        </div>
      </div>

      {activeExhibit && (
        <div className="absolute inset-0 z-20 bg-black/70 backdrop-blur-sm flex items-center justify-center p-6">
          {activeExhibit}
        </div>
      )}

      {(visibleTranscript || thinking) && (
        <div
          className="absolute bottom-8 left-1/2 -translate-x-1/2
          max-w-2xl w-[80%]
          bg-black/70 backdrop-blur
          px-6 py-4 rounded-xl
          text-base text-center text-slate-100
          border border-slate-800
          max-h-40 overflow-y-auto"
        >
          {visibleTranscript}
        </div>
      )}
    </div>
  );
}
