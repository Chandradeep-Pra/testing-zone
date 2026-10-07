"use client";

import { CheckCircle2, RefreshCw, Sparkles } from "lucide-react";

export type StartupStage =
  | "idle"
  | "server"
  | "websocket"
  | "gemini"
  | "microphone"
  | "speaker"
  | "ready"
  | "error";

const STARTUP_STAGES = [
  ["server", "Preparing session"],
  ["websocket", "Connecting to voice service"],
  ["speaker", "Connecting examiner audio"],
  ["microphone", "Connecting microphone"],
  ["gemini", "Waiting for examiner"],
  ["ready", "Connection ready"],
] as const;

export default function StartupOverlay({
  failed,
  stage,
  isStarting,
  onRetry,
}: {
  failed: boolean;
  stage: StartupStage;
  isStarting: boolean;
  onRetry: () => void;
}) {
  const activeStage = stage === "idle" ? "server" : stage;
  const activeIndex = STARTUP_STAGES.findIndex(([key]) => key === activeStage);

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/35 p-4 backdrop-blur-md">
      {failed ? (
        <div role="alert" className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)] p-8 text-center text-[var(--text-primary)] shadow-2xl">
          <Sparkles size={28} className="mx-auto text-[var(--accent)]" />
          <h2 className="mt-4 text-[22px] font-semibold">Uh oh, we hit a snag</h2>
          <p className="mt-2 text-[15px] leading-6 text-[var(--text-secondary)]">
            We couldn’t start your viva. Restart to try again.
          </p>
          <button
            type="button"
            onClick={onRetry}
            disabled={isStarting}
            className="mt-6 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-5 py-3 text-[17px] font-semibold text-white transition hover:bg-[var(--accent-hover)] disabled:opacity-60"
          >
            <RefreshCw size={17} />
            Restart Viva
          </button>
        </div>
      ) : (
        <div role="status" aria-live="polite" className="w-full max-w-lg rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)] p-8 text-[var(--text-primary)] shadow-2xl">
          <div className="flex items-center gap-3">
            <span className="h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
            <div>
              <h2 className="text-[22px] font-semibold">Preparing your viva</h2>
              <p className="mt-1 text-[15px] text-[var(--text-secondary)]">
                {STARTUP_STAGES.find(([key]) => key === activeStage)?.[1] || "Connecting to your examiner"}…
              </p>
            </div>
          </div>
          <ol className="mt-6 space-y-3 border-t border-[var(--border)] pt-5">
            {STARTUP_STAGES.map(([key, label], index) => {
              const complete = stage === "ready" || activeIndex > index;
              const current = activeIndex === index;
              return (
                <li key={key} className={`flex items-center gap-3 text-[15px] ${complete || current ? "text-[var(--text-primary)]" : "text-[var(--text-tertiary)]"}`}>
                  {complete ? (
                    <CheckCircle2 size={16} className="text-[var(--accent)]" />
                  ) : current ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
                  ) : (
                    <span className="h-4 w-4 rounded-full border border-[var(--border)]" />
                  )}
                  {label}
                  {current ? "…" : ""}
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </div>
  );
}
