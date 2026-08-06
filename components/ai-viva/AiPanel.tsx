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
  avatarVideo?: React.ReactNode;
  stageLabel?: string;
  stageRemainingSec?: number;
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

const fillers: string[] = [
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
  avatarVideo,
  stageLabel,
  stageRemainingSec,
}: Props) {
  const [filler, setFiller] = useState("");
  // Keep an investigation visible while the examiner asks the candidate to
  // interpret it. Previously it was hidden for the entire spoken question.
  const activeExhibit = exhibit;

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
      className={`relative h-full w-full overflow-hidden rounded-[28px] border bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0.75),_rgba(2,6,23,0.96))] transition-all duration-300 ${
        keywordDetected
          ? "border-orange-400 shadow-[0_0_32px_rgba(251,146,60,0.45)]"
          : speaking
          ? "border-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.35)]"
          : thinking
          ? "border-yellow-400 shadow-[0_0_30px_rgba(234,179,8,0.25)]"
          : "border-slate-800"
      }`}
    >
      <div className="absolute left-5 top-5 text-xs uppercase tracking-[0.28em] text-slate-500">
        Urologics AI Viva
      </div>

      <div className="absolute right-5 top-5 text-xs">
        <span
          className={`rounded-full border px-3 py-1 ${
            keywordDetected
              ? "border-orange-400/30 bg-orange-400/10 text-orange-300"
              : speaking
              ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
              : thinking
              ? "border-yellow-400/20 bg-yellow-400/10 text-yellow-300"
              : "border-white/10 bg-white/[0.04] text-slate-400"
          }`}
        >
          {keywordDetected ? "Keyword Heard" : statusText}
        </span>
      </div>

      <div className="absolute inset-0 flex items-center justify-center bg-transparent">
        {avatarVideo ? (
          <div className="h-full w-full">{avatarVideo}</div>
        ) : (
          <div className="flex items-center justify-center scale-110">
            {thinking && <SiriWaveComponent amplitude={0.2} speed={0.02} />}
            {speaking && <SiriWaveComponent amplitude={amplitude} speed={0.08} />}
            {!thinking && !speaking && <SiriWaveComponent amplitude={0.1} speed={0.03} />}
          </div>
        )}
      </div>

      {activeExhibit && (
        <div className="absolute inset-0 z-20 bg-black/70 backdrop-blur-sm flex items-center justify-center p-6">
          {activeExhibit}
        </div>
      )}

      {stageLabel && typeof stageRemainingSec === "number" && (
        <div className="absolute bottom-5 left-5 z-30 flex items-center gap-2 rounded-full border border-white/15 bg-black/55 px-3.5 py-2 text-xs font-medium text-white shadow-lg backdrop-blur-xl">
          <span className="h-2 w-2 rounded-full bg-orange-400" />
          <span>{stageLabel}</span>
          <span className="text-white/35">•</span>
          <span className="font-mono text-cyan-200">
            {Math.floor(stageRemainingSec / 60)}:{Math.max(0, stageRemainingSec % 60).toString().padStart(2, "0")}
          </span>
        </div>
      )}

      {(visibleTranscript || thinking) && (
        <div
          className="absolute bottom-8 left-1/2 -translate-x-1/2
          max-w-2xl w-[80%]
          bg-black/45 backdrop-blur-xl
          px-6 py-4 rounded-xl
          text-base text-center text-slate-100
          border border-white/10
          max-h-40 overflow-y-auto"
        >
          {visibleTranscript}
        </div>
      )}
    </div>
  );
}
