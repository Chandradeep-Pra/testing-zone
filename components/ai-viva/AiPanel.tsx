"use client";

import React from "react";

type Props = {
  speaking: boolean;
  thinking?: boolean;
  transcript: string;
  exhibit?: React.ReactNode;
};

export function AiPanel({
  speaking,
  thinking = false,
  transcript,
  exhibit,
}: Props) {
  return (
    <div
      className={`relative h-full w-full rounded-xl border overflow-hidden
        ${speaking
          ? "border-emerald-400 shadow-[0_0_25px_rgba(52,211,153,0.35)]"
          : thinking
          ? "border-yellow-400 shadow-[0_0_25px_rgba(250,204,21,0.25)]"
          : "border-slate-800"
        }`}
    >
      {/* Header */}
      <div className="absolute top-4 left-4 text-xs uppercase tracking-widest text-slate-400">
        AI Examiner
      </div>

      {/* Status Indicator */}
      <div className="absolute top-4 right-4 text-xs">
        {speaking && (
          <span className="text-emerald-400">Speaking…</span>
        )}
        {!speaking && thinking && (
          <span className="text-yellow-400">Thinking…</span>
        )}
      </div>

      {/* Center AI Presence */}
      <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
        <div
          className={`w-32 h-32 rounded-full flex items-center justify-center
            text-3xl font-semibold bg-slate-800 transition-all
            ${speaking ? "scale-105" : ""}
          `}
        >
          AI
        </div>
      </div>

      {/* Exhibit Overlay */}
      {exhibit && (
        <div
          className="absolute inset-0 z-20 bg-black/70 backdrop-blur-sm
                     flex items-center justify-center p-6"
        >
          {exhibit}
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
          {thinking ? "Let me think…" : transcript}
        </div>
      )}
    </div>
  );
}