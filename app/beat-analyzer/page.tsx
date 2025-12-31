"use client";

import { useRouter } from "next/navigation";
import React, { useState } from "react";

const BeatAnalyze = () => {
  const router = useRouter();
  const [link, setLink] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);

  const hasLink = link.trim().length > 0;

  return (
    <main className="
      min-h-screen
      bg-[color:var(--color-background)]
      px-6 py-5
    ">
      {/* Top bar */}
      <div className="flex items-center mb-10">
        <button
          onClick={() => router.back()}
          className="
            flex items-center gap-2
            text-sm font-medium
            text-[color:var(--color-muted)]
            hover:text-[color:var(--color-foreground)]
            transition-colors
          "
        >
          <span className="text-lg leading-none">‹</span>
          Back
        </button>
      </div>

      {/* Content */}
      <section className="max-w-xl mx-auto">
        <h1 className="text-2xl font-semibold mb-1">
          Beat Analyzer
        </h1>
        <p className="text-sm text-[color:var(--color-muted)] mb-10">
          Load a dance video and listen to its rhythm structure
        </p>

        {/* Input + Actions Row */}
        <div className="flex items-center gap-3">
          {/* Input */}
          <div className="
            flex-1
            bg-[color:var(--color-surface)]
            border border-[color:var(--color-border)]
            rounded-2xl
            px-4 py-3
            transition-colors
            focus-within:border-[color:var(--color-accent)]
          ">
            <input
              type="text"
              placeholder="Paste YouTube link"
              value={link}
              onChange={(e) => {
                setLink(e.target.value);
                setIsPlaying(false);
              }}
              className="
                w-full
                bg-transparent
                outline-none
                text-sm
                placeholder:text-[color:var(--color-muted)]
              "
            />
          </div>

          {/* Play button */}
          {hasLink && (
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="
                w-11 h-11
                rounded-full
                flex items-center justify-center
                bg-[color:var(--color-accent-soft)]
                hover:bg-[color:var(--color-accent)]
                transition-all
                group
              "
            >
              <span className="
                text-[color:var(--color-accent)]
                group-hover:text-white
                text-sm
              ">
                {isPlaying ? "❚❚" : "▶"}
              </span>
            </button>
          )}

          {/* Analyze button */}
          {hasLink && (
            <button
              className="
                h-11
                px-4
                rounded-xl
                text-sm font-medium
                border border-[color:var(--color-border)]
                text-[color:var(--color-foreground)]
                hover:border-[color:var(--color-accent)]
                transition-colors
              "
            >
              Analyze Beats
            </button>
          )}
        </div>

        {/* Playback hint */}
        {isPlaying && (
          <p className="
            mt-4
            text-sm
            text-[color:var(--color-muted)]
          ">
            Playing audio preview…
          </p>
        )}
      </section>
    </main>
  );
};

export default BeatAnalyze;
