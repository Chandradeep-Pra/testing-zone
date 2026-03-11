"use client";

import React, { useEffect, useState } from "react";

type Props = {
  speaking: boolean;
  thinking?: boolean;
  transcript: string;
  exhibit?: React.ReactNode;
  amplitude?: number;
};

const fillers = [
  "Hmm...",
  "Okay...",
  "Right...",
  "I see...",
  "Alright...",
];

export function AiPanel({
  speaking,
  thinking = false,
  transcript,
  exhibit,
  amplitude = 0,
}: Props) {

  const [activeExhibit, setActiveExhibit] = useState<React.ReactNode | null>(null);
  const [filler, setFiller] = useState("");

  // Only show exhibit when NOT speaking, NOT thinking, and exhibit is provided
  useEffect(() => {
    if (!speaking && !thinking && exhibit) {
      setActiveExhibit(exhibit);
    } else {
      setActiveExhibit(null);
    }
  }, [exhibit, speaking, thinking]);

  useEffect(() => {
    if (thinking) {
      const random = fillers[Math.floor(Math.random() * fillers.length)];
      setFiller(random);
    }
  }, [thinking]);

  const audioScale = 1 + amplitude * 0.25;

  return (
    <div
      className={`relative h-full w-full rounded-xl border overflow-hidden bg-slate-950
      ${
        speaking
          ? "border-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.35)]"
          : thinking
          ? "border-yellow-400 shadow-[0_0_30px_rgba(234,179,8,0.25)]"
          : "border-slate-800"
      }`}
    >

      {/* Header */}
      <div className="absolute top-4 left-4 text-xs uppercase tracking-widest text-slate-400">
        AI Examiner
      </div>

      {/* Status */}
      <div className="absolute top-4 right-4 text-xs">
        {speaking && <span className="text-emerald-400">Speaking</span>}
        {!speaking && thinking && (
          <span className="text-yellow-400">Listening</span>
        )}
      </div>

      {/* CENTER */}
      <div className="absolute inset-0 flex items-center justify-center bg-slate-900">

        {/* THINKING NEURAL WAVES */}
        {thinking && (
          <>
            <div className="absolute w-64 h-64 rounded-full border border-yellow-400/20 animate-ai-wave-expand" />
            <div className="absolute w-64 h-64 rounded-full border border-yellow-400/20 animate-ai-wave-expand delay-1000" />
            <div className="absolute w-64 h-64 rounded-full border border-yellow-400/20 animate-ai-wave-expand delay-2000" />

            <div className="absolute w-48 h-48 animate-ai-orbit-slow">
              <div className="absolute w-2 h-2 bg-yellow-400 rounded-full top-0 left-1/2 -translate-x-1/2" />
              <div className="absolute w-2 h-2 bg-yellow-400 rounded-full bottom-0 left-1/2 -translate-x-1/2" />
              <div className="absolute w-2 h-2 bg-yellow-400 rounded-full left-0 top-1/2 -translate-y-1/2" />
              <div className="absolute w-2 h-2 bg-yellow-400 rounded-full right-0 top-1/2 -translate-y-1/2" />
            </div>
          </>
        )}

        {/* AI CORE */}
        <div
          style={{
            transform: `scale(${audioScale})`,
          }}
          className={`relative w-28 h-28 rounded-full flex items-center justify-center
          text-2xl font-semibold
          bg-gradient-to-br from-slate-700 to-slate-900
          transition-all duration-150
          ${
            speaking
              ? "shadow-[0_0_40px_rgba(16,185,129,0.6)]"
              : thinking
              ? "shadow-[0_0_35px_rgba(234,179,8,0.4)]"
              : "animate-ai-breath"
          }`}
        >
          AI
        </div>

        {/* SPEAKING WAVE */}
        {speaking && (
          <div className="absolute bottom-32 flex items-end space-x-1">
            {[0,1,2,3,4,5,6].map((i) => {

              const height =
                10 +
                amplitude * 45 +
                Math.random() * 6;

              return (
                <div
                  key={i}
                  className="w-2 bg-emerald-400 rounded transition-all duration-75"
                  style={{ height }}
                />
              );
            })}
          </div>
        )}

      </div>

      {/* Exhibit */}
      {activeExhibit && (
        <div className="absolute inset-0 z-20 bg-black/70 backdrop-blur-sm flex items-center justify-center p-6">
          {activeExhibit}
        </div>
      )}

      {/* Transcript */}
      {(transcript || thinking) && (
        <div
          className="absolute bottom-8 left-1/2 -translate-x-1/2
          max-w-2xl w-[80%]
          bg-black/70 backdrop-blur
          px-6 py-4 rounded-xl
          text-base text-center text-slate-100
          border border-slate-800
          max-h-40 overflow-y-auto"
        >
          {thinking ? filler : transcript}
        </div>
      )}

    </div>
  );
}