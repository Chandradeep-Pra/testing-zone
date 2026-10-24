import React from "react";
import UrologicsBrand from "@/components/brand/UrologicsBrand";

function ReviewHeaderSkeleton() {
  return (
    <header className="urologics-header flex shrink-0 items-center gap-3 px-3 py-2 sm:gap-4 sm:px-4 sm:py-2.5">
      <UrologicsBrand product="Grand Mocks" compact />
      <div className="h-7 w-px shrink-0 bg-[var(--border)]" />
      <div className="h-4 min-w-0 flex-1 animate-pulse rounded bg-[var(--surface-muted)] sm:max-w-64" />
      <div className="h-10 w-20 shrink-0 animate-pulse rounded-full border border-[var(--border)] bg-[var(--accent-soft)]" />
    </header>
  );
}

function QuestionNavigationSkeleton() {
  return (
    <div className="flex h-[62px] shrink-0 items-center gap-2 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)] p-2 shadow-[0_2px_8px_var(--shadow-soft)]">
      <div className="flex min-w-0 flex-1 gap-2 overflow-hidden p-1">
        {Array.from({ length: 12 }, (_, index) => (
          <div key={index} className="h-11 w-11 shrink-0 animate-pulse rounded-full border border-[var(--border)] bg-[var(--surface-muted)]" />
        ))}
      </div>
      <div className="h-10 w-16 shrink-0 animate-pulse rounded-xl border border-[var(--border)] bg-[var(--surface-muted)]" />
    </div>
  );
}

function QuestionItemSkeleton() {
  return (
    <article className="rounded-[24px] border border-[var(--border)] bg-[var(--surface-raised)] p-4 sm:rounded-[28px] sm:p-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="h-5 w-4/5 animate-pulse rounded-lg bg-[var(--surface-muted)]" />
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
    </article>
  );
}

export default function Loading() {
  return (
    <main className="urologics-shell h-dvh overflow-hidden px-3 py-3 sm:px-6 sm:py-4">
      <div className="mx-auto flex h-full min-h-0 max-w-6xl flex-col gap-3">
        <ReviewHeaderSkeleton />
        <QuestionNavigationSkeleton />
        <section className="min-h-0 flex-1 overflow-hidden">
          <QuestionItemSkeleton />
        </section>
      </div>
    </main>
  );
}

