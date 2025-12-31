"use client";

import { Mic } from "lucide-react";

type Props = {
  speaking: boolean;
  listening: boolean;
  transcript: string;
  history: string[];
  onStartTalk: () => void;
  onStopTalk: () => void;
  showHistory: boolean;
  onToggleHistory: () => void;
};

export function CandidatePanel({
  speaking,
  listening,
  transcript,
  history,
  onStartTalk,
  onStopTalk,
  showHistory,
  onToggleHistory
}: Props) {
  return (
    <div
      className={`flex-1 rounded-2xl border relative overflow-hidden
        ${(listening || speaking)
          ? "border-blue-400 shadow-[0_0_30px_rgba(96,165,250,0.35)]"
          : "border-neutral-800"
        }`}
    >
      {/* Header */}
      <div className="absolute top-4 left-4 text-xs text-neutral-400">
        Candidate
      </div>

      {/* Status indicator */}
      {(listening || speaking) && (
        <div className="absolute top-4 right-4 flex items-center gap-2 text-blue-400">
          <Mic size={16} />
          {speaking ? "Speaking…" : "Listening…"}
        </div>
      )}

      {/* Avatar */}
      <div className="h-full flex items-center justify-center bg-neutral-900">
        <div className="w-28 h-28 rounded-full bg-neutral-800 flex items-center justify-center text-2xl">
          You
        </div>
      </div>

      {/* 🎤 CLICK TO TALK */}
      <div className="absolute bottom-24 left-1/2 -translate-x-1/2">
        <button
          onPointerDown={() => {
            if (!listening) onStartTalk();
          }}
          onPointerUp={() => {
            if (listening) onStopTalk();
          }}
          className={`px-6 py-3 rounded-full font-medium transition
            ${listening
              ? "bg-blue-500 text-black"
              : "bg-neutral-800 hover:bg-neutral-700 text-white"
            }`}
        >
          {listening ? "Listening…" : "Click to Talk"}
        </button>
      </div>

      {/* Live transcript */}
      {transcript && (
        <div
          className="absolute bottom-6 left-1/2 -translate-x-1/2
                     max-w-xl bg-white text-black px-5 py-3
                     rounded-xl text-lg text-center"
        >
          {transcript}
        </div>
      )}

      {/* History toggle */}
      <button
        onClick={onToggleHistory}
        className="absolute bottom-6 right-6 text-xs text-neutral-400 underline"
      >
        {showHistory ? "Hide history" : "View history"}
      </button>

      {/* History drawer */}
      {showHistory && (
        <div
          className="absolute inset-x-4 bottom-16 max-h-60
                     bg-neutral-900 border border-neutral-700
                     rounded-xl p-4 overflow-y-auto text-sm space-y-2"
        >
          {history.length === 0 && (
            <div className="text-neutral-500">No responses yet</div>
          )}
          {history.map((h, i) => (
            <div key={i} className="bg-neutral-800 px-3 py-2 rounded-lg">
              {h}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
