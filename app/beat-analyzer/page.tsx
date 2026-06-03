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
    <main className="urologics-shell px-4 py-4 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-5xl space-y-4 sm:space-y-6">
        <header className="urologics-panel flex flex-col items-start gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-5">
          <UrologicsBrand product="Labs" tag="Internal utility surface" />
          <button onClick={() => router.back()} className="urologics-button-secondary gap-2">
            <ArrowLeft size={16} />
            Back
          </button>
        </header>

        <section className="urologics-panel p-5 sm:p-8 md:p-10">
          <div className="urologics-chip">Experimental Utility</div>
          <h1 className="mt-5 text-3xl font-semibold text-[#071014] sm:mt-6 sm:text-4xl">
            Urologics Rhythm Lab
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-[#071014]/65">
            A branded utility page for internal analysis tools, aligned visually with the main Urologics experience.
          </p>

          <div className="mt-7 flex flex-col gap-3 md:flex-row md:gap-4">
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
              className="urologics-button-secondary w-full disabled:cursor-not-allowed disabled:opacity-40 md:w-auto"
            >
              <AudioLines size={16} />
            </button>
            <button
              disabled={!link.trim()}
              className="urologics-button-primary w-full gap-2 disabled:cursor-not-allowed disabled:opacity-40 md:w-auto"
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
