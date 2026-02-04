"use client";

import React from "react";

type Props = {
  speaking: boolean;
  thinking?: boolean;
  transcript: string;
  exhibit?: React.ReactNode; // optional: image / report / viewer
};

export function 
AiPanel({
  speaking,
  thinking = false,
  transcript,
  exhibit,
}: Props) {
  return (
    <div
      className={`flex-1 rounded-2xl border relative overflow-hidden w-full
        ${speaking
          ? "border-emerald-400 shadow-[0_0_30px_rgba(52,211,153,0.35)]"
          : thinking
          ? "border-yellow-400 shadow-[0_0_30px_rgba(250,204,21,0.25)]"
          : "border-neutral-800"
        }`}
    >
      {/* Header */}
      <div className="absolute top-4 left-4 text-xs uppercase tracking-widest text-neutral-400">
        AI Examiner
      </div>

      {/* Status Indicator */}
      {speaking && (
        <div className="absolute top-4 right-4 text-xs text-emerald-400">
          Speaking…
        </div>
      )}

      {!speaking && thinking && (
        <div className="absolute top-4 right-4 text-xs text-yellow-400">
          Thinking…
        </div>
      )}

      {/* Avatar */}
      <div className="h-full flex items-center justify-center bg-neutral-900">
        <div className="w-28 h-28 rounded-full bg-neutral-800 flex items-center justify-center text-2xl font-semibold">
          AI
        </div>
      </div>

      {/* Exhibit Overlay (Image / Report / Viewer) */}
      {exhibit && (
        <div className="absolute inset-0 z-10 bg-black/60 backdrop-blur-sm
                        flex items-center justify-center">
          {exhibit}
        </div>
      )}

      {/* Transcript */}
      {(transcript || thinking) && (
        <div
          className="absolute bottom-6 left-1/2 -translate-x-1/2
                     max-w-xl bg-black/70 backdrop-blur
                     px-5 py-3 rounded-xl text-lg text-center
                     max-h-40 overflow-y-auto"
        >
          {thinking ? "Let me think…" : transcript}
        </div>
      )}
    </div>
  );
}
