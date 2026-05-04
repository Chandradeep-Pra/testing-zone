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
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 py-6">
        <header className="urologics-header flex flex-wrap items-center justify-between gap-4 px-5 py-4 md:px-6">
          <UrologicsBrand product="Platform" tag="AI Viva, Mocks, and Grand Mocks" />
          <UrologicsNav current="Overview" />
        </header>

        <section className="grid flex-1 gap-8 py-24 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="urologics-panel px-7 py-8 md:px-10 md:py-10">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#0f7896]/12 bg-cyan-50 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#0f7896]">
                <Sparkles size={14} />
                Urologics
              </div>

              <h1 className="mt-7 max-w-3xl text-4xl font-semibold tracking-[-0.04em] text-[#071014] sm:text-5xl">
                One place for
                <span className="block text-[#0f7896]">
                  AI Viva, Mocks, and Grand Mocks.
                </span>
              </h1>

              <p className="mt-6 max-w-2xl text-base leading-8 text-[#071014]/65 md:text-lg">
                Premium urology prep for viva practice, mocks, and full mock runs.
              </p>

              <div className="mt-9 flex flex-wrap gap-3">
                <button
                  onClick={() => router.push("/ai-viva/cases")}
                  className="urologics-button-primary gap-2"
                >
                  Launch Urologics AI Viva
                  <ArrowRight size={17} />
                </button>
                <button
                  onClick={() => router.push("/mocks")}
                  className="urologics-button-secondary"
                >
                  Open Mock Centre
                </button>
              </div>
            </div>
          </div>

          <div className="grid gap-5">
            <div className="urologics-panel p-7">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-50 text-[#0f7896]">
                  <Stethoscope size={20} />
                </div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#0f7896]">
                  Platform
                </div>
              </div>

              <h2 className="mt-6 text-2xl font-semibold tracking-[-0.03em] text-[#071014]">
                Built for focused exam prep.
              </h2>
              <p className="mt-4 text-sm leading-7 text-[#071014]/65">
                Start with AI Viva, then move into mocks and grand mocks.
              </p>
            </div>

            <div className="grid gap-4">
              {pillars.map((pillar) => {
                const Icon = pillar.icon;

                return (
                  <div
                    key={pillar.title}
                    className="urologics-subpanel p-5"
                  >
                    <div className="flex gap-4">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] bg-cyan-50 text-[#0f7896]">
                        <Icon size={24} />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-[#071014]">{pillar.title}</h3>
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
