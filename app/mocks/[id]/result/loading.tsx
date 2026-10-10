import React from "react";
import { ShieldCheck, Trophy } from "lucide-react";
import UrologicsBrand from "@/components/brand/UrologicsBrand";

function ReviewHeaderSkeleton() {
  return (
    <header className="urologics-header flex flex-col items-start gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-5">
      <UrologicsBrand product="Grand Mocks" tag="Session results" />
      <div className="inline-flex animate-pulse items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-1 text-xs font-semibold text-[var(--text-secondary)]">
        <span className="h-2 w-2 rounded-full bg-[var(--accent)] animate-ping" />
        Loading Review...
      </div>
    </header>
  );
}

function ReviewHeroSkeleton() {
  return (
    <section className="grid gap-4 lg:grid-cols-[1fr_0.38fr]">
      <div className="urologics-panel p-5 sm:p-8">
        <div className="flex items-start gap-3 sm:gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent-strong)] sm:h-14 sm:w-14">
            <ShieldCheck size={22} className="animate-pulse" />
          </div>
          <div className="flex-1 space-y-3">
            <div className="h-3 w-36 animate-pulse rounded bg-[var(--surface-muted)]" />
            <div className="h-7 w-3/4 animate-pulse rounded-lg bg-[var(--surface-muted)] sm:h-8" />
            <div className="h-4 w-full animate-pulse rounded bg-[var(--surface-muted)]/70" />
            <div className="h-4 w-2/3 animate-pulse rounded bg-[var(--surface-muted)]/70" />
          </div>
        </div>
      </div>

      <div className="urologics-panel flex flex-col items-center justify-center p-5 text-center sm:p-8">
        <Trophy className="text-[var(--accent-strong)] animate-bounce" size={24} />
        <div className="mt-4 h-10 w-28 animate-pulse rounded-xl bg-[var(--accent-soft)]" />
        <div className="mt-2 h-4 w-24 animate-pulse rounded bg-[var(--surface-muted)]" />
      </div>
    </section>
  );
}

function QuestionItemSkeleton({ index }: { index: number }) {
  return (
    <article className="urologics-panel p-4 sm:p-6">
      <div className="flex items-start gap-3">
        <div className="mt-1 h-8 w-8 shrink-0 animate-pulse rounded-full bg-[var(--surface-muted)]" />
        <div className="flex-1 space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-[var(--text-tertiary)]">Q{index}</span>
              <div className="h-5 w-4/5 animate-pulse rounded-lg bg-[var(--surface-muted)]" />
            </div>
            <div className="h-4 w-2/3 animate-pulse rounded bg-[var(--surface-muted)]/60" />
          </div>

          <div className="grid gap-2.5 sm:gap-3 md:grid-cols-2">
            {[0, 1, 2, 3, 4].map((optIndex) => (
              <div
                key={optIndex}
                className="flex items-center gap-3 rounded-[24px] border border-[var(--border)] bg-[var(--surface-muted)]/40 p-2.5 sm:p-3"
              >
                <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-[var(--surface-muted)]" />
                <div className="h-4 flex-1 animate-pulse rounded bg-[var(--surface-muted)]" />
              </div>
            ))}
          </div>

          <div className="h-16 w-full animate-pulse rounded-[20px] border border-[var(--border)] bg-[var(--surface-muted)]/30" />
        </div>
      </div>
    </article>
  );
}

export default function Loading() {
  return (
    <main className="urologics-shell px-3 py-3 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-6xl space-y-3 sm:space-y-6">
        <ReviewHeaderSkeleton />
        <ReviewHeroSkeleton />
        <section className="space-y-4">
          <QuestionItemSkeleton index={1} />
          <QuestionItemSkeleton index={2} />
          <QuestionItemSkeleton index={3} />
        </section>
      </div>
    </main>
  );
}

