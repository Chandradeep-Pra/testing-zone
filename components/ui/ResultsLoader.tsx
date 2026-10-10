"use client";

import { useEffect, useState } from "react";
import { Award, CheckCircle2, ShieldCheck, Sparkles, Stethoscope } from "lucide-react";

interface ResultsLoaderProps {
  title?: string;
  stages?: string[];
}

const DEFAULT_STAGES = [
  { label: "Validating exam submissions...", icon: ShieldCheck, detail: "Checking answer authenticity" },
  { label: "Grading against clinical rubric...", icon: Stethoscope, detail: "Scoring objective responses" },
  { label: "Computing rank & percentile...", icon: Award, detail: "Comparing with candidate cohort" },
  { label: "Preparing comprehensive review...", icon: Sparkles, detail: "Generating question explanations" },
];

export default function ResultsLoader({
  title = "Analyzing Exam Performance",
  stages = DEFAULT_STAGES.map((s) => s.label),
}: ResultsLoaderProps) {
  const [currentStage, setCurrentStage] = useState(0);
  const [progress, setProgress] = useState(15);

  useEffect(() => {
    // Stage transition timer
    const stageInterval = setInterval(() => {
      setCurrentStage((prev) => (prev < stages.length - 1 ? prev + 1 : prev));
    }, 1200);

    // Smooth simulated progress bar
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 92) return prev;
        const jump = Math.max(1, Math.floor(Math.random() * 8));
        return Math.min(92, prev + jump);
      });
    }, 200);

    return () => {
      clearInterval(stageInterval);
      clearInterval(progressInterval);
    };
  }, [stages.length]);

  const activeStage = DEFAULT_STAGES[currentStage] || DEFAULT_STAGES[0];
  const ActiveIcon = activeStage.icon;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[var(--background)]/90 p-4 backdrop-blur-2xl">
      {/* Background ambient lighting glow */}
      <div className="pointer-events-none absolute h-96 w-96 rounded-full bg-[var(--accent)]/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-10 right-1/4 h-80 w-80 rounded-full bg-emerald-500/10 blur-3xl" />

      <div className="relative w-full max-w-lg overflow-hidden rounded-[32px] border border-[var(--border)] bg-[var(--surface-raised)] p-7 text-center shadow-[0_24px_70px_var(--shadow-brand)] sm:p-10">
        {/* Top Clinical Badge */}
        <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--accent-soft)] px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--accent-strong)]">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--accent)] opacity-75"></span>
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--accent)]"></span>
          </span>
          Urologics Exam Engine
        </div>

        {/* Central Animated Clinical Emblem */}
        <div className="relative mx-auto my-7 flex h-24 w-24 items-center justify-center sm:h-28 sm:w-28">
          {/* Animated concentric pulsing rings */}
          <div className="absolute inset-0 animate-ping rounded-full border border-[var(--accent)]/30 duration-1000" />
          <div className="absolute -inset-2 animate-pulse rounded-full bg-[var(--accent-soft)]/60 blur-md" />
          <div className="absolute inset-0 rounded-full border border-[var(--border)] bg-[var(--surface-tint)] shadow-[0_12px_28px_var(--shadow-soft)]" />

          {/* Center icon */}
          <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--accent)] text-[var(--accent-text)] shadow-[0_8px_20px_var(--shadow-brand)]">
            <ActiveIcon size={30} className="animate-pulse" />
          </div>
        </div>

        {/* Heading */}
        <h2 className="text-2xl font-bold tracking-[-0.03em] text-[var(--text-primary)] sm:text-3xl">
          {title}
        </h2>

        {/* Dynamic Stage Pill */}
        <div className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-[var(--accent-strong)]">
          <CheckCircle2 size={16} className="text-[var(--accent)]" />
          <span key={currentStage} className="animate-in fade-in slide-in-from-bottom-1 duration-300">
            {stages[currentStage] || "Calculating results..."}
          </span>
        </div>

        {/* Progress Bar Container */}
        <div className="mt-7">
          <div className="flex items-center justify-between text-xs font-semibold text-[var(--text-secondary)]">
            <span className="uppercase tracking-[0.16em]">
              Step {currentStage + 1} of {stages.length}
            </span>
            <span className="font-mono text-[var(--accent-strong)]">{progress}%</span>
          </div>
          <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-[var(--surface-muted)] p-0.5 border border-[var(--border)]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[var(--accent)] to-[var(--accent-strong)] transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Subtitle / Guidance */}
        <p className="mt-6 text-xs leading-5 text-[var(--text-secondary)] sm:text-sm">
          Please keep this session active. Your attempt is being recorded and ranked on the official leaderboard.
        </p>
      </div>
    </div>
  );
}
