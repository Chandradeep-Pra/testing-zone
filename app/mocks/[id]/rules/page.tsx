"use client";

import { ArrowRight, ClipboardCheck, TimerReset } from "lucide-react";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import UrologicsBrand from "@/components/brand/UrologicsBrand";

interface Mock {
  id: string;
  title: string;
  durationMinutes: number;
}

export default function MockRulesPage() {
  const { id } = useParams();
  const router = useRouter();
  const [mock, setMock] = useState<Mock | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/mocks/${id}`);
        const data = await res.json();
        setMock(data.mock);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      void load();
    }
  }, [id]);

  if (loading) {
    return (
      <main className="urologics-shell flex min-h-screen items-center justify-center">
        <div className="urologics-panel px-8 py-6 text-[#071014]/65">Loading mock briefing...</div>
      </main>
    );
  }

  if (!mock) {
    return (
      <main className="urologics-shell flex min-h-screen items-center justify-center">
        <div className="urologics-panel px-8 py-6 text-[#071014]/65">Mock not found.</div>
      </main>
    );
  }

  const totalTime = mock.durationMinutes + 10;

  return (
    <main className="urologics-shell px-6 py-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="urologics-panel px-6 py-5">
          <UrologicsBrand product="Grand Mocks" tag="Candidate briefing" />
        </header>

        <section className="urologics-panel p-8 md:p-10">
          <div className="urologics-chip">Session Rules</div>
          <h1 className="mt-6 max-w-3xl text-4xl font-semibold tracking-[-0.04em] text-[#071014] sm:text-5xl">{mock.title || "Grand Mock"}</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-[#071014]/65">
            Review the mock conditions before you enter the timed session. The visual design mirrors the rest of the Urologics product line so the transition feels like one complete platform.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <div className="urologics-subpanel p-5">
              <TimerReset className="text-[#0f7896]" size={18} />
              <div className="mt-3 text-sm font-semibold text-[#071014]">Main timer</div>
              <p className="mt-2 text-sm leading-6 text-[#071014]/65">
                You have {mock.durationMinutes} minutes for the test, with one optional 10 minute break.
              </p>
            </div>
            <div className="urologics-subpanel p-5">
              <ClipboardCheck className="text-[#0f7896]" size={18} />
              <div className="mt-3 text-sm font-semibold text-[#071014]">Exam conditions</div>
              <p className="mt-2 text-sm leading-6 text-[#071014]/65">
                The timer continues once started, so use a stable connection and a distraction-free environment.
              </p>
            </div>
          </div>

          <div className="mt-8 space-y-3">
  {[
    `You have ${mock.durationMinutes} minutes to complete the mock.`,
    `You may take one break of 10 minutes during the session.`,
    `Total available time including the break is ${totalTime} minutes.`,
    `Do not refresh or close the browser while the mock is active.`,
  ].map((text, index) => (
    <div
      key={index}
      className="flex items-start gap-3 rounded-xl border border-[#0f7896]/10 bg-cyan-50 px-4 py-3"
    >
      {/* Pointer */}
      <div className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-[#0f7896]" />

      {/* Text */}
      <p className="text-sm leading-7 text-[#071014]/75">
        {text}
      </p>
    </div>
  ))}
</div>

          <button
            onClick={() => router.push(`/mocks/${id}`)}
            className="urologics-button-primary mt-10 gap-2"
          >
            Start Mock Session
            <ArrowRight size={16} />
          </button>
        </section>
      </div>
    </main>
  );
}
