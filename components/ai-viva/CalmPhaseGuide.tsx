import { Check, Clock3 } from "lucide-react";

import {
  CALM_PHASE_GUIDANCE,
  CALM_VIVA_PHASES,
  PHASE_DURATION_SEC,
  type ActiveCalmVivaPhase,
} from "@/lib/viva-flow";

function formatClock(seconds: number) {
  return `${Math.floor(seconds / 60)}:${Math.max(0, seconds % 60)
    .toString()
    .padStart(2, "0")}`;
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
  const duration = PHASE_DURATION_SEC[activePhase];
  const progress = Math.min(
    100,
    Math.max(0, ((duration - remainingInPhaseSec) / duration) * 100),
  );

  return (
    <aside className="w-full shrink-0 overflow-hidden rounded-[24px] border border-[#0f7896]/15 bg-white shadow-[0_14px_34px_rgba(15,120,150,0.10)] lg:h-full lg:w-[310px]">
      <div className="bg-gradient-to-br from-[#0f7896] to-[#0b6078] px-4 py-4 text-white sm:px-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-cyan-100">
              Current stage
            </p>
            <h2 className="mt-1 text-lg font-semibold leading-tight">{guide.title}</h2>
          </div>
          <div className="flex shrink-0 items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 font-mono text-sm font-semibold backdrop-blur">
            <Clock3 className="h-3.5 w-3.5" />
            {formatClock(remainingInPhaseSec)}
          </div>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/20">
          <div
            className="h-full rounded-full bg-orange-300 transition-[width] duration-1000"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-3 text-xs leading-5 text-cyan-50/90">{guide.explainer}</p>
      </div>

      <div className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-5 lg:grid-cols-1 lg:p-4">
        {CALM_VIVA_PHASES.map((phase, index) => {
          const item = CALM_PHASE_GUIDANCE[phase];
          const complete = index < activeIndex;
          const active = phase === activePhase;

          return (
            <div
              key={phase}
              className={`relative rounded-2xl border p-3 transition-colors ${
                active
                  ? "border-[#0f7896]/30 bg-cyan-50"
                  : complete
                    ? "border-emerald-200 bg-emerald-50/70"
                    : "border-slate-200 bg-slate-50/60"
              }`}
            >
              <div className="flex items-start gap-2.5">
                <div
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                    active
                      ? "bg-[#0f7896] text-white"
                      : complete
                        ? "bg-emerald-500 text-white"
                        : "bg-slate-200 text-slate-500"
                  }`}
                >
                  {complete ? <Check className="h-3.5 w-3.5" /> : index + 1}
                </div>
                <div className="min-w-0">
                  <p className={`text-xs font-semibold leading-4 ${active ? "text-[#0b6078]" : complete ? "text-emerald-800" : "text-slate-500"}`}>
                    {item.title}
                  </p>
                  <p className="mt-0.5 text-[10px] font-medium text-slate-400">{item.shortTime}</p>
                </div>
              </div>

              {active && (
                <ul className="mt-3 space-y-1.5 border-t border-[#0f7896]/10 pt-3">
                  {item.prompts.map((prompt) => (
                    <li key={prompt} className="flex gap-2 text-[11px] leading-4 text-[#071014]/65">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-orange-400" />
                      <span>{prompt}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
}
