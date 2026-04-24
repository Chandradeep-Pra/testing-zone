"use client";

import { ArrowRight, BrainCircuit, ClipboardCheck, Sparkles, Stethoscope, TimerReset } from "lucide-react";
import { useRouter } from "next/navigation";

import UrologicsBrand from "@/components/brand/UrologicsBrand";
import UrologicsNav from "@/components/brand/UrologicsNav";

const pillars = [
  {
    title: "Urologics AI Viva",
    copy: "Adaptive viva practice.",
    icon: BrainCircuit,
    accent: "from-teal-400/30 to-cyan-400/10",
    iconTone: "text-teal-200",
  },
  {
    title: "Mocks",
    copy: "Timed mock sessions.",
    icon: ClipboardCheck,
    accent: "from-sky-400/30 to-indigo-400/10",
    iconTone: "text-sky-200",
  },
  {
    title: "Grand Mocks",
    copy: "Full rehearsal sessions.",
    icon: TimerReset,
    accent: "from-fuchsia-400/30 to-violet-400/10",
    iconTone: "text-fuchsia-200",
  },
];

export default function Home() {
  const router = useRouter();

  return (
    <main className="urologics-shell relative overflow-hidden bg-[#04111f]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(45,212,191,0.16),transparent_24%),radial-gradient(circle_at_80%_18%,rgba(59,130,246,0.16),transparent_22%),radial-gradient(circle_at_50%_100%,rgba(217,70,239,0.12),transparent_30%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),transparent)]" />

      <div className="relative  mx-auto flex min-h-screen w-full max-w-7xl flex-col px-5 py-5 md:px-6">
        <header className="urologics-header flex flex-wrap items-center justify-between gap-4 px-5 py-4 md:px-6">
          <UrologicsBrand product="Platform" tag="AI Viva, Mocks, and Grand Mocks" />
          <UrologicsNav current="Overview" />
        </header>

        <section className="grid flex-1 gap-7 py-8 lg:grid-cols-[1.12fr_0.88fr] lg:py-12">
          <div className="relative overflow-hidden rounded-[36px] border border-white/10 bg-[linear-gradient(145deg,rgba(8,17,31,0.98),rgba(10,28,48,0.92))] px-7 py-8 shadow-[0_30px_80px_rgba(2,6,23,0.42)] md:px-10 md:py-10">
            <div className="pointer-events-none absolute -right-16 -top-12 h-48 w-48 rounded-full bg-teal-400/15 blur-3xl" />
            <div className="pointer-events-none absolute bottom-0 right-0 h-56 w-56 rounded-full bg-sky-400/10 blur-3xl" />

            <div className="relative">
              <div className="inline-flex items-center gap-2 rounded-full border border-teal-300/20 bg-teal-400/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.26em] text-teal-100">
                <Sparkles size={14} />
                Urologics
              </div>

              <h1 className="mt-7 max-w-4xl text-5xl font-extrabold leading-[1.03] tracking-[-0.04em] text-white md:text-7xl">
                One place for
                <span className="block bg-[linear-gradient(90deg,#5eead4,#7dd3fc,#c084fc)] bg-clip-text text-transparent">
                  AI Viva, Mocks, and Grand Mocks.
                </span>
              </h1>

              <p className="mt-6 max-w-2xl text-base leading-8 text-slate-200 md:text-lg">
                Premium urology prep for viva practice, mocks, and full mock runs.
              </p>

              <div className="mt-9 flex flex-wrap gap-3">
                <button
                  onClick={() => router.push("/ai-viva/cases")}
                  className="inline-flex items-center gap-2 rounded-full bg-[#7ff0d8] px-6 py-3.5 text-sm font-bold text-slate-950 shadow-[0_18px_40px_rgba(45,212,191,0.28)] transition hover:translate-y-[-1px] hover:bg-[#9bf5e1]"
                >
                  Launch Urologics AI Viva
                  <ArrowRight size={17} />
                </button>
                <button
                  onClick={() => router.push("/mocks")}
                  className="inline-flex items-center rounded-full border border-white/12 bg-white/[0.06] px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-white/[0.1]"
                >
                  Open Mock Centre
                </button>
              </div>
            </div>
          </div>

          <div className="grid gap-5">
            <div className="rounded-[32px] border border-white/10 bg-[linear-gradient(145deg,rgba(19,18,43,0.92),rgba(8,17,31,0.94))] p-7 shadow-[0_24px_60px_rgba(2,6,23,0.38)]">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-rose-300/20 bg-rose-400/10 text-rose-200">
                  <Stethoscope size={20} />
                </div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-rose-200">
                  Platform
                </div>
              </div>

              <h2 className="mt-6 text-2xl font-bold tracking-[-0.03em] text-white">
                Built for focused exam prep.
              </h2>
              <p className="mt-4 text-sm leading-7 text-slate-200">
                Start with AI Viva, then move into mocks and grand mocks.
              </p>
            </div>

            <div className="grid gap-4">
              {pillars.map((pillar) => {
                const Icon = pillar.icon;

                return (
                  <div
                    key={pillar.title}
                    className={`rounded-[28px] border border-white/10 bg-[linear-gradient(145deg,rgba(8,17,31,0.98),rgba(12,24,42,0.92))] p-5 shadow-[0_22px_54px_rgba(2,6,23,0.34)]`}
                  >
                    <div className="flex gap-4">
                      <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] bg-gradient-to-br ${pillar.accent} ${pillar.iconTone}`}>
                        <Icon size={24} />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-white">{pillar.title}</h3>
                        <p className="mt-2 text-sm leading-6 text-slate-300">{pillar.copy}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
