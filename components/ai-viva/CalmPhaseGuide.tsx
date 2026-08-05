import { Check, ChevronRight } from "lucide-react";

import {
  CALM_PHASE_GUIDANCE,
  CALM_VIVA_PHASES,
  PHASE_DURATION_SEC,
  type ActiveCalmVivaPhase,
} from "@/lib/viva-flow";

function formatClock(seconds: number) {
  return `${Math.floor(seconds / 60)}:${Math.max(0, seconds % 60).toString().padStart(2, "0")}`;
}

export default function CalmPhaseGuide({
  activePhase,
  remainingInPhaseSec,
}: {
  activePhase: ActiveCalmVivaPhase;
  remainingInPhaseSec: number;
}) {
  const activeIndex = CALM_VIVA_PHASES.indexOf(activePhase);
  const guide = CALM_PHASE_GUIDANCE[activePhase];
  const progress = Math.min(100, Math.max(0, ((PHASE_DURATION_SEC[activePhase] - remainingInPhaseSec) / PHASE_DURATION_SEC[activePhase]) * 100));

  return (
    <aside className="border-b border-[#0f7896]/12 bg-cyan-50/70 px-3 py-3 sm:px-5 md:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 lg:flex-row lg:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto pb-1 lg:pb-0">
          {CALM_VIVA_PHASES.map((phase, index) => {
            const item = CALM_PHASE_GUIDANCE[phase];
            const complete = index < activeIndex;
            const active = phase === activePhase;
            return (
              <div key={phase} className="flex shrink-0 items-center gap-2">
                <div className={`rounded-full border px-3 py-1.5 text-xs font-medium ${active ? "border-[#0f7896] bg-[#0f7896] text-white" : complete ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-[#0f7896]/12 bg-white text-[#071014]/45"}`}>
                  {complete ? <Check className="mr-1 inline h-3 w-3" /> : `${index + 1}. `}{item.title} · {item.shortTime}
                </div>
                {index < CALM_VIVA_PHASES.length - 1 && <ChevronRight className="h-3 w-3 text-[#0f7896]/30" />}
              </div>
            );
          })}
        </div>
        <div className="min-w-0 rounded-2xl border border-[#0f7896]/12 bg-white p-3 lg:w-[390px]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0f7896]">Now: {guide.title}</p>
              <p className="mt-1 text-xs leading-5 text-[#071014]/65">{guide.explainer}</p>
            </div>
            <span className="shrink-0 rounded-full bg-orange-50 px-2.5 py-1 font-mono text-xs font-semibold text-orange-700">{formatClock(remainingInPhaseSec)}</span>
          </div>
          <p className="mt-1.5 truncate text-[11px] text-[#071014]/50">Cover: {guide.prompts.join(" · ")}</p>
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-cyan-100"><div className="h-full bg-[#0f7896] transition-[width] duration-1000" style={{ width: `${progress}%` }} /></div>
        </div>
      </div>
    </aside>
  );
}
