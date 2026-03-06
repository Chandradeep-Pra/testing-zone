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
      className={`relative h-full w-full rounded-xl border overflow-hidden bg-slate-950
      ${
        speaking
          ? "border-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.35)]"
          : thinking
          ? "border-yellow-400 shadow-[0_0_25px_rgba(234,179,8,0.25)]"
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
          <span className="text-yellow-400">Thinking</span>
        )}
      </div>

      {/* Center */}
      <div className="absolute inset-0 flex items-center justify-center bg-slate-900">

        {/* THINKING ORBIT */}
        {!speaking && thinking && (
          <div className="absolute w-40 h-40 animate-spin">
            <div className="absolute w-3 h-3 bg-yellow-400 rounded-full top-0 left-1/2 -translate-x-1/2" />
            <div className="absolute w-3 h-3 bg-yellow-400 rounded-full bottom-0 left-1/2 -translate-x-1/2" />
            <div className="absolute w-3 h-3 bg-yellow-400 rounded-full left-0 top-1/2 -translate-y-1/2" />
            <div className="absolute w-3 h-3 bg-yellow-400 rounded-full right-0 top-1/2 -translate-y-1/2" />
          </div>
        )}

        {/* AI CORE */}
        <div
          className={`relative w-28 h-28 rounded-full flex items-center justify-center
          text-2xl font-semibold bg-slate-800 transition-all
          ${speaking ? "scale-105 animate-pulse" : ""}
          ${thinking ? "border-2 border-yellow-400" : ""}
        `}
        >
          AI
        </div>

        {/* SPEAKING WAVE */}
        {speaking && (
          <div className="absolute bottom-32 flex items-end space-x-1">
            <div className="w-2 h-6 bg-emerald-400 rounded animate-bounce" />
            <div className="w-2 h-10 bg-emerald-400 rounded animate-bounce delay-75" />
            <div className="w-2 h-7 bg-emerald-400 rounded animate-bounce delay-150" />
            <div className="w-2 h-12 bg-emerald-400 rounded animate-bounce delay-200" />
            <div className="w-2 h-8 bg-emerald-400 rounded animate-bounce delay-300" />
          </div>
        )}
      </div>

      {/* Exhibit */}
      {exhibit && (
        <div className="absolute inset-0 z-20 bg-black/70 backdrop-blur-sm flex items-center justify-center p-6">
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
          {thinking ? "Analyzing your answer..." : transcript}
        </div>
      )}
    </div>
  );
}