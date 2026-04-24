"use client";

import { ArrowLeft, AudioLines, Wand2 } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useState } from "react";

import UrologicsBrand from "@/components/brand/UrologicsBrand";

const BeatAnalyze = () => {
  const router = useRouter();
  const [link, setLink] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);

  return (
    <main className="urologics-shell px-6 py-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="urologics-panel flex flex-wrap items-center justify-between gap-4 px-6 py-5">
          <UrologicsBrand product="Labs" tag="Internal utility surface" />
          <button onClick={() => router.back()} className="urologics-button-secondary gap-2">
            <ArrowLeft size={16} />
            Back
          </button>
        </header>

        <section className="urologics-panel p-8 md:p-10">
          <div className="urologics-chip">Experimental Utility</div>
          <h1 className="mt-6 text-4xl font-semibold text-white">Urologics Rhythm Lab</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-400">
            A branded utility page for internal analysis tools, aligned visually with the main Urologics experience.
          </p>

          <div className="mt-8 flex flex-col gap-4 md:flex-row">
            <input
              type="text"
              placeholder="Paste a YouTube link"
              value={link}
              onChange={(e) => {
                setLink(e.target.value);
                setIsPlaying(false);
              }}
              className="urologics-input flex-1"
            />
            <button
              onClick={() => setIsPlaying((value) => !value)}
              disabled={!link.trim()}
              className="urologics-button-secondary disabled:cursor-not-allowed disabled:opacity-40"
            >
              <AudioLines size={16} />
            </button>
            <button
              disabled={!link.trim()}
              className="urologics-button-primary gap-2 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Wand2 size={16} />
              Analyze Beats
            </button>
          </div>

          {isPlaying && (
            <div className="urologics-subpanel mt-6 p-4 text-sm text-slate-300">
              Playing audio preview...
            </div>
          )}
        </section>
      </div>
    </main>
  );
};

export default BeatAnalyze;
