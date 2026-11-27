"use client";

import React from "react";
import ExaminerOrb from "./ExaminerOrb";

type Props = {
  speaking: boolean;
  thinking?: boolean;
  transcript: string;
  exhibit?: React.ReactNode;
  amplitude?: number;
  keywordDetected?: boolean;
  avatarVideo?: React.ReactNode;
  listening?: boolean;
};

export function AiPanel({
  speaking,
  thinking = false,
  transcript,
  exhibit,
  keywordDetected = false,
  avatarVideo,
  listening = false,
}: Props) {
  const activeExhibit = exhibit;
  const statusText = speaking ? "Examiner speaking" : thinking ? "Preparing response" : listening ? "Listening" : "Ready";
  const orbState = speaking ? "composing" : thinking ? "solving" : listening ? "listening" : "breathing";

  return (
    <div
      className={`relative h-full w-full overflow-hidden bg-[#111315] transition-colors duration-500 ${speaking ? "bg-[#121817]" : ""}`}
    >
      <div className="pointer-events-none absolute inset-x-0 top-[15%] flex justify-center text-[10px] font-medium uppercase tracking-[0.2em] text-white/40 sm:top-[18%]">
        <span className={`flex items-center gap-2 ${speaking ? "text-emerald-200/80" : ""}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${speaking ? "animate-pulse bg-emerald-300" : thinking ? "animate-pulse bg-white/60" : "bg-white/30"}`} />
          {keywordDetected ? "Key point heard" : statusText}
        </span>
      </div>

      <div className="absolute inset-0 flex items-center justify-center pb-12">
        {avatarVideo ? (
          <div className="h-full w-full">{avatarVideo}</div>
        ) : !activeExhibit ? (
          <div className="flex h-[220px] w-full items-center justify-center sm:h-[300px]">
            <ExaminerOrb state={orbState} label={statusText} />
          </div>
        ) : null}
      </div>

      {activeExhibit && (
        <div className="absolute inset-0 z-20 bg-black/70 backdrop-blur-sm flex items-center justify-center p-2 sm:p-3">
          {activeExhibit}
        </div>
      )}

      <div className="absolute inset-x-4 bottom-28 mx-auto max-w-4xl text-center sm:bottom-32" aria-live="polite" aria-atomic="true">
        <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.18em] text-white/35">Live transcript</p>
        <p className="mx-auto line-clamp-3 text-base leading-7 text-white/90 sm:text-lg sm:leading-8">
          {transcript || (thinking ? "Preparing the next question…" : "Your examiner will begin shortly.")}
        </p>
      </div>
    </div>
  );
}
