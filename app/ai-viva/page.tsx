"use client";

import { ArrowRight, BrainCircuit, Mic, ScanSearch, Stethoscope } from "lucide-react";
import { useRouter } from "next/navigation";

import UrologicsBrand from "@/components/brand/UrologicsBrand";
import UrologicsNav from "@/components/brand/UrologicsNav";

export default function VivaIntroPage() {
  const router = useRouter();

  return (
    <main className="urologics-shell">
      <div className="mx-auto max-w-7xl px-6 py-6">
        <header className="urologics-header flex flex-wrap items-center justify-between gap-4 px-6 py-4">
          <UrologicsBrand product="AI Viva" tag="Flagship oral exam preparation" />
          <UrologicsNav current="AI Viva" />
        </header>

        <section className="grid gap-8 py-10 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="urologics-panel p-8 md:p-10">
            <div className="urologics-chip">Flagship Experience</div>
            <h1 className="mt-6 text-5xl font-semibold leading-tight text-white md:text-7xl">
              Urologics AI Viva
            </h1>
            <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-300">
              The signature Urologics product for realistic case-based oral preparation, examiner-led pacing, image-linked discussion, and polished post-session scoring.
            </p>
            <div className="mt-10 grid gap-4 md:grid-cols-3">
              <div className="urologics-subpanel p-5">
                <Mic className="text-teal-300" size={18} />
                <div className="mt-3 text-sm font-semibold text-white">Voice First</div>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Speak naturally and move through a proper examiner-led flow.
                </p>
              </div>
              <div className="urologics-subpanel p-5">
                <ScanSearch className="text-sky-300" size={18} />
                <div className="mt-3 text-sm font-semibold text-white">Case Exhibits</div>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Bring linked imaging and exhibits into the oral discussion room.
                </p>
              </div>
              <div className="urologics-subpanel p-5">
                <BrainCircuit className="text-amber-300" size={18} />
                <div className="mt-3 text-sm font-semibold text-white">Premium Review</div>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Finish with a more complete score and cleaner reporting layer.
                </p>
              </div>
            </div>
            <button
              onClick={() => router.push("/ai-viva/cases")}
              className="urologics-button-primary mt-10 gap-2"
            >
              Browse Viva Cases
              <ArrowRight size={16} />
            </button>
          </div>

          <div className="urologics-panel flex flex-col justify-between p-8">
            <div>
              <div className="flex items-center gap-3 text-teal-300">
                <Stethoscope size={18} />
                <span className="text-xs uppercase tracking-[0.28em]">Why It Feels Different</span>
              </div>
              <div className="mt-6 space-y-4 text-sm leading-7 text-slate-300">
                <p>
                  Urologics AI Viva is designed as the premium front-of-house experience for the platform.
                </p>
                <p>
                  It should feel less like a demo tool and more like a complete exam product with deliberate setup, examiner identity, and clinical atmosphere.
                </p>
                <p>
                  From the entry overlay to the scoring screen, the visual language now centers Urologics as the parent brand and AI Viva as the hero product.
                </p>
              </div>
            </div>
            <div className="urologics-subpanel mt-8 p-5">
              <div className="text-xs uppercase tracking-[0.24em] text-slate-500">Product Line</div>
              <div className="mt-3 text-xl font-semibold text-white">Urologics</div>
              <div className="mt-2 text-sm text-slate-400">
                AI Viva at the center, supported by mocks and grand mocks in the same premium prep environment.
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
