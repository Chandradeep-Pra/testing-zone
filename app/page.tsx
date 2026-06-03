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
  },
  {
    title: "Mocks",
    copy: "Timed mock sessions.",
    icon: ClipboardCheck,
  },
  {
    title: "Grand Mocks",
    copy: "Full rehearsal sessions.",
    icon: TimerReset,
  },
];

export default function Home() {
  const router = useRouter();

  return (
    <main className="urologics-shell overflow-hidden">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-4 sm:px-6">
        <header className="urologics-header flex flex-col items-start gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5 md:px-6">
          <UrologicsBrand product="Platform" tag="AI Viva, Mocks, and Grand Mocks" />
          <div className="w-full sm:w-auto">
            <UrologicsNav current="Overview" />
          </div>
        </header>

        <section className="grid flex-1 gap-6 py-10 sm:gap-8 md:py-24 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="urologics-panel px-5 py-6 sm:px-7 sm:py-8 md:px-10 md:py-10">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#0f7896]/12 bg-cyan-50 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#0f7896] sm:px-4 sm:text-[11px] sm:tracking-[0.22em]">
                <Sparkles size={14} />
                Urologics
              </div>

              <h1 className="mt-6 max-w-3xl text-3xl font-semibold tracking-[-0.04em] text-[#071014] sm:mt-7 sm:text-4xl md:text-5xl">
                One place for
                <span className="block text-[#0f7896]">
                  AI Viva, Mocks, and Grand Mocks.
                </span>
              </h1>

              <p className="mt-4 max-w-2xl text-sm leading-7 text-[#071014]/65 sm:mt-6 sm:text-base sm:leading-8 md:text-lg">
                Premium urology prep for viva practice, mocks, and full mock runs.
              </p>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <button
                  onClick={() => router.push("/ai-viva/cases")}
                  className="urologics-button-primary w-full gap-2 sm:w-auto"
                >
                  Launch Urologics AI Viva
                  <ArrowRight size={17} />
                </button>
                <button
                  onClick={() => router.push("/mocks")}
                  className="urologics-button-secondary w-full sm:w-auto"
                >
                  Open Mock Centre
                </button>
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:gap-5">
            <div className="urologics-panel p-5 sm:p-7">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-50 text-[#0f7896] sm:h-12 sm:w-12">
                  <Stethoscope size={20} />
                </div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#0f7896] sm:text-[11px] sm:tracking-[0.22em]">
                  Platform
                </div>
              </div>

              <h2 className="mt-5 text-xl font-semibold tracking-[-0.03em] text-[#071014] sm:mt-6 sm:text-2xl">
                Built for focused exam prep.
              </h2>
              <p className="mt-3 text-sm leading-7 text-[#071014]/65">
                Start with AI Viva, then move into mocks and grand mocks.
              </p>
            </div>

            <div className="grid gap-3 sm:gap-4">
              {pillars.map((pillar) => {
                const Icon = pillar.icon;

                return (
                  <div
                    key={pillar.title}
                    className="urologics-subpanel p-4 sm:p-5"
                  >
                    <div className="flex gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[20px] bg-cyan-50 text-[#0f7896] sm:h-14 sm:w-14">
                        <Icon size={24} />
                      </div>
                      <div>
                        <h3 className="text-base font-semibold text-[#071014] sm:text-lg">{pillar.title}</h3>
                        <p className="mt-2 text-sm leading-6 text-[#071014]/65">{pillar.copy}</p>
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
