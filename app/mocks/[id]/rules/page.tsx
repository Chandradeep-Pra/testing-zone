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
        <div className="urologics-panel px-8 py-6 text-slate-300">Loading mock briefing...</div>
      </main>
    );
  }

  if (!mock) {
    return (
      <main className="urologics-shell flex min-h-screen items-center justify-center">
        <div className="urologics-panel px-8 py-6 text-slate-400">Mock not found.</div>
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
          <h1 className="mt-6 text-4xl font-semibold text-white">{mock.title || "Grand Mock"}</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-400">
            Review the mock conditions before you enter the timed session. The visual design mirrors the rest of the Urologics product line so the transition feels like one complete platform.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <div className="urologics-subpanel p-5">
              <TimerReset className="text-teal-300" size={18} />
              <div className="mt-3 text-sm font-semibold text-white">Main timer</div>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                You have {mock.durationMinutes} minutes for the test, with one optional 10 minute break.
              </p>
            </div>
            <div className="urologics-subpanel p-5">
              <ClipboardCheck className="text-sky-300" size={18} />
              <div className="mt-3 text-sm font-semibold text-white">Exam conditions</div>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                The timer continues once started, so use a stable connection and a distraction-free environment.
              </p>
            </div>
          </div>

          <div className="mt-8 space-y-3 text-sm leading-7 text-slate-300">
            <p>You have <strong>{mock.durationMinutes} minutes</strong> to complete the mock.</p>
            <p>You may take <strong>one break of 10 minutes</strong> during the session.</p>
            <p>Total available time including the break is <strong>{totalTime} minutes</strong>.</p>
            <p>Do not refresh or close the browser while the mock is active.</p>
            <p>Your responses are stored locally during the session and used for the result screen.</p>
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
