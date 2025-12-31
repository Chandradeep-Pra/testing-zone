"use client";

import { useState } from "react";
import {
  PlayCircle,
  Clock,
  Mic,
  FileText,
  Stethoscope
} from "lucide-react";

import { vivaContext } from "@/ai-viva-data/vivaContext";
import { VivaChat } from "@/components/ai-viva/ChatViva";
import VivaVoiceAi from "@/components/ai-viva/VivaVoiceAi";

export default function VivaPage() {
  const [started, setStarted] = useState(false);

  if (!started) {
    return (
      <main className="min-h-screen bg-neutral-950 text-neutral-100 p-8 w-full">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">

          {/* LEFT — CASE DETAILS */}
          <div className="border border-neutral-800 rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-2 text-neutral-300">
              <Stethoscope size={18} />
              <span className="text-sm uppercase tracking-wide">
                Case Overview
              </span>
            </div>

            <h1 className="text-2xl font-semibold">
              {vivaContext.case.title}
            </h1>

            <div className="text-sm text-neutral-400">
              Level: {vivaContext.case.level}
            </div>

            <p className="text-neutral-200 leading-relaxed">
              {vivaContext.case.stem}
            </p>

            <div>
              <h3 className="text-sm font-semibold text-neutral-300 mb-2">
                Objectives
              </h3>
              <ul className="list-disc list-inside space-y-1 text-neutral-400">
                {vivaContext.case.objectives.map((obj, i) => (
                  <li key={i}>{obj}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* RIGHT — INSTRUCTIONS */}
          <div className="border border-neutral-800 rounded-xl p-6 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-neutral-300">
                <FileText size={18} />
                <span className="text-sm uppercase tracking-wide">
                  Viva Instructions
                </span>
              </div>

              <ul className="space-y-3 text-neutral-300 text-sm">
                <li className="flex gap-2">
                  <Clock size={16} />
                  <span>
                    Duration: {vivaContext.viva_rules.max_duration_minutes} minutes
                  </span>
                </li>
                <li className="flex gap-2">
                  <Mic size={16} />
                  <span>Voice-based, one question at a time</span>
                </li>
                <li className="flex gap-2">
                  <PlayCircle size={16} />
                  <span>No interruptions, examiner-led</span>
                </li>
              </ul>

              <p className="text-xs text-neutral-500 leading-relaxed">
                This is a simulated clinical viva. The examiner will adapt
                questions based on your responses. Scores will be provided
                at the end.
              </p>
            </div>

            <button
              onClick={() => setStarted(true)}
              className="
                mt-6 w-full flex items-center justify-center gap-2
                bg-white text-black rounded-lg py-3 font-medium
                hover:bg-neutral-200 transition
              "
            >
              <PlayCircle />
              Start Viva
            </button>
          </div>
        </div>
      </main>
    );
  }

  /* Placeholder for next subtask */
  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center">
      {/* {started && <VivaChat />} */}
      {started && <VivaVoiceAi />}

    </main>
  );
}
