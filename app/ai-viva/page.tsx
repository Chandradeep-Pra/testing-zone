"use client";

import { ArrowRight, BrainCircuit, Mic, ScanSearch, Stethoscope } from "lucide-react";
import { useRouter } from "next/navigation";

import UrologicsHeader from "@/components/brand/UrologicsHeader";

export default function VivaIntroPage() {
  const router = useRouter();

  return (
    <main className="urologics-shell">
      <div className="mx-auto max-w-7xl px-6 py-2">
        <UrologicsHeader current="AI Viva" product="AI Viva" tag="Flagship oral exam preparation" />

        <section className="grid gap-8 py-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="urologics-panel p-8 md:p-10">
            <div className="urologics-chip">Flagship Experience</div>
            <h1 className="mt-6 max-w-3xl text-4xl font-semibold tracking-[-0.04em] text-[#071014] sm:text-5xl">
              Urologics AI Viva
            </h1>
            <p className="mt-5 max-w-3xl text-lg leading-8 text-[#071014]/65">
              The signature Urologics product for realistic case-based oral preparation, examiner-led pacing, image-linked discussion, and polished post-session scoring.
            </p>
            <div className="mt-10 grid gap-4 md:grid-cols-3">
              <div className="urologics-subpanel p-5">
                <Mic className="text-[#0f7896]" size={18} />
                <div className="mt-3 text-sm font-semibold text-[#071014]">Voice First</div>
                <p className="mt-2 text-sm leading-6 text-[#071014]/65">
                  Speak naturally and move through a proper examiner-led flow.
                </p>
              </div>
              <div className="urologics-subpanel p-5">
                <ScanSearch className="text-[#0f7896]" size={18} />
                <div className="mt-3 text-sm font-semibold text-[#071014]">Case Exhibits</div>
                <p className="mt-2 text-sm leading-6 text-[#071014]/65">
                  Bring linked imaging and exhibits into the oral discussion room.
                </p>
              </div>
              <div className="urologics-subpanel p-5">
                <BrainCircuit className="text-[#0f7896]" size={18} />
                <div className="mt-3 text-sm font-semibold text-[#071014]">Premium Review</div>
                <p className="mt-2 text-sm leading-6 text-[#071014]/65">
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
              <div className="flex items-center gap-3 text-[#0f7896]">
                <Stethoscope size={18} />
                <span className="text-xs uppercase tracking-[0.28em]">Why It Feels Different</span>
              </div>
              <div className="mt-6 space-y-4 text-sm leading-7 text-[#071014]/65">
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
              <div className="text-xs uppercase tracking-[0.22em] text-[#0f7896]">Product Line</div>
              <div className="mt-3 text-xl font-semibold text-[#071014]">Urologics</div>
              <div className="mt-2 text-sm text-[#071014]/65">
                AI Viva at the center, supported by mocks and grand mocks in the same premium prep environment.
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
