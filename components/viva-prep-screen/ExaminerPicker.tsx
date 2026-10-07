"use client";

import { CheckCircle2 } from "lucide-react";
import { EXAMINER_VOICES, type VivaMode } from "@/lib/examiner-voices";

export default function ExaminerPicker({
  selectedMode,
  selectedExaminerId,
  onSelect,
}: {
  selectedMode: VivaMode;
  selectedExaminerId: string;
  onSelect: (examinerId: string) => void;
}) {
  const examiners = EXAMINER_VOICES[selectedMode];

  return (
    <section className="rounded-2xl border-2 border-[var(--accent)] bg-[var(--surface-raised)] p-5 sm:p-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-[22px] font-semibold leading-7 tracking-tight text-[var(--text-primary)]">
            Choose your examiner
          </h2>
          <p className="mt-1 text-[15px] text-[var(--text-secondary)]">Select a voice and examination style.</p>
        </div>
        <span className="text-[13px] text-[var(--text-secondary)]">{examiners.length} available</span>
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {examiners.map((examiner) => {
          const active = examiner.id === selectedExaminerId;
          return (
            <button
              key={examiner.id}
              type="button"
              onClick={() => onSelect(examiner.id)}
              aria-pressed={active}
              className={`min-w-0 rounded-xl border px-4 py-3.5 text-left transition-colors ${
                active
                  ? "border-[var(--accent)] bg-[var(--accent-soft)] shadow-[0_0_0_1px_var(--accent)]"
                  : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-muted)]"
              }`}
            >
              <span className="flex items-start justify-between gap-3">
                <span className="min-w-0">
                  <span className="block truncate text-[17px] font-semibold text-[var(--text-primary)]">
                    {examiner.name}
                  </span>
                  <span className="mt-1 block truncate text-[13px] text-[var(--text-secondary)]">
                    {examiner.title}
                  </span>
                </span>
                {active && <CheckCircle2 size={18} className="shrink-0 text-[var(--accent)]" />}
              </span>
              <span className="mt-2 block text-[13px] leading-5 text-[var(--text-secondary)]">
                {examiner.personality}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
