"use client";

import { CalendarClock, CircleDot, Mail, ShieldCheck, Sparkles, TimerReset } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import UrologicsBrand from "@/components/brand/UrologicsBrand";
import UrologicsNav from "@/components/brand/UrologicsNav";

type TimestampLike = {
  _seconds?: number;
};

interface Mock {
  id: string;
  quizId: string;
  title: string;
  startTime: string | number | TimestampLike;
  durationMinutes: number;
}

const getStart = (startTime: string | number | TimestampLike) => {
  if (typeof startTime === "object" && startTime?._seconds) {
    return startTime._seconds * 1000;
  }

  return typeof startTime === "string" || typeof startTime === "number"
    ? new Date(startTime).getTime()
    : 0;
};

const isToday = (timestamp: number) => {
  const d = new Date(timestamp);
  const now = new Date();

  return (
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear()
  );
};

export default function TodayMocksPage() {
  const [mocks, setMocks] = useState<Mock[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMock, setSelectedMock] = useState<Mock | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const router = useRouter();

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/mocks");
        const data = (await res.json()) as { mocks?: Mock[] };

        const filtered = (data.mocks || []).filter((mock) => {
          const start = getStart(mock.startTime);
          const end = start + 7 * 24 * 60 * 60 * 1000;
          return start && isToday(start) && Date.now() <= end;
        });

        setMocks(filtered);

        const saved = localStorage.getItem("mockUser");
        if (saved) {
          const parsed = JSON.parse(saved) as { name?: string; email?: string };
          setName(parsed.name || "");
          setEmail(parsed.email || "");
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const handleContinue = () => {
    if (!name || !email || !selectedMock) return;
    localStorage.setItem("mockUser", JSON.stringify({ name, email }));
    router.push(`/mocks/${selectedMock.id}/rules`);
  };

  return (
    <main className="urologics-shell relative overflow-hidden bg-[#03101d]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.14),transparent_22%),radial-gradient(circle_at_85%_15%,rgba(251,191,36,0.14),transparent_18%),radial-gradient(circle_at_70%_100%,rgba(45,212,191,0.14),transparent_26%)]" />

      <div className="relative mx-auto max-w-7xl px-5 py-5 md:px-6">
        <header className="urologics-header flex flex-wrap items-center justify-between gap-4 px-5 py-4 md:px-6">
          <UrologicsBrand product="Grand Mocks" tag="Timed practice with premium exam-day polish" />
          <UrologicsNav current="Mocks" />
        </header>

        <section className="grid gap-7 py-8 lg:grid-cols-[1.08fr_0.92fr] lg:py-12">
          <div className="rounded-[34px] border border-white/10 bg-[linear-gradient(145deg,rgba(9,20,38,0.98),rgba(15,35,59,0.92))] p-7 shadow-[0_28px_74px_rgba(2,6,23,0.42)] md:p-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-300/20 bg-sky-400/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.26em] text-sky-100">
              <Sparkles size={14} />
              Mocks
            </div>

            <h1 className="mt-7 text-4xl font-extrabold tracking-[-0.04em] text-white md:text-6xl">
              Timed mock sessions.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-slate-200 md:text-lg">
              Join today&apos;s mock or grand mock.
            </p>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              <div className="rounded-[24px] border border-white/10 bg-white/[0.05] p-5">
                <CalendarClock className="text-sky-200" size={18} />
                <div className="mt-3 text-sm font-bold text-white">Today</div>
                <p className="mt-2 text-sm leading-6 text-slate-300">Active sessions only.</p>
              </div>
              <div className="rounded-[24px] border border-white/10 bg-white/[0.05] p-5">
                <TimerReset className="text-amber-200" size={18} />
                <div className="mt-3 text-sm font-bold text-white">Timed</div>
                <p className="mt-2 text-sm leading-6 text-slate-300">Simple timed flow.</p>
              </div>
              <div className="rounded-[24px] border border-white/10 bg-white/[0.05] p-5">
                <ShieldCheck className="text-teal-200" size={18} />
                <div className="mt-3 text-sm font-bold text-white">Ready</div>
                <p className="mt-2 text-sm leading-6 text-slate-300">Built for exam prep.</p>
              </div>
            </div>
          </div>

          <div className="rounded-[34px] border border-white/10 bg-[linear-gradient(145deg,rgba(24,24,53,0.9),rgba(8,17,31,0.94))] p-7 shadow-[0_24px_60px_rgba(2,6,23,0.36)] md:p-8">
            <div className="text-[11px] font-semibold uppercase tracking-[0.26em] text-fuchsia-200">
              Sessions
            </div>
            <div className="mt-4 text-3xl font-extrabold tracking-[-0.03em] text-white">
              {loading ? "Loading mock schedule" : `${mocks.length} active sessions today`}
            </div>
            <p className="mt-4 text-sm leading-7 text-slate-200">
              Pick a session and continue.
            </p>
          </div>
        </section>

        <section className="pb-16">
          {loading ? (
            <div className="rounded-[30px] border border-white/10 bg-[linear-gradient(145deg,rgba(9,20,38,0.98),rgba(15,35,59,0.92))] p-10 text-center text-slate-200">
              Loading scheduled mocks...
            </div>
          ) : mocks.length === 0 ? (
            <div className="rounded-[30px] border border-white/10 bg-[linear-gradient(145deg,rgba(9,20,38,0.98),rgba(15,35,59,0.92))] p-10 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.06] text-sky-200">
                <CalendarClock size={20} />
              </div>
              <div className="text-xl font-bold text-white">No sessions today</div>
              <p className="mt-3 text-sm leading-7 text-slate-200">
                New sessions will appear here.
              </p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {mocks.map((mock, index) => (
                <div
                  key={mock.id}
                  className={`rounded-[30px] border border-white/10 p-6 shadow-[0_24px_60px_rgba(2,6,23,0.34)] ${
                    index % 3 === 0
                      ? "bg-[linear-gradient(145deg,rgba(7,33,45,0.96),rgba(10,22,38,0.94))]"
                      : index % 3 === 1
                        ? "bg-[linear-gradient(145deg,rgba(16,24,52,0.96),rgba(8,17,31,0.94))]"
                        : "bg-[linear-gradient(145deg,rgba(31,19,49,0.96),rgba(8,17,31,0.94))]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-100">
                      <CircleDot size={10} />
                      Live Today
                    </span>
                    <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-300">
                      {mock.durationMinutes} min
                    </span>
                  </div>
                  <h2 className="mt-5 text-2xl font-bold text-white">{mock.title || "Grand Mock"}</h2>
                  <p className="mt-3 text-sm leading-7 text-slate-200">
                    Available until{" "}
                    {new Date(getStart(mock.startTime) + 7 * 24 * 60 * 60 * 1000).toLocaleString()}
                  </p>
                  <button
                    onClick={() => setSelectedMock(mock)}
                    className="mt-8 inline-flex w-full items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-sky-100"
                  >
                    Register For Session
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {selectedMock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-xl">
          <div className="w-full max-w-lg rounded-[32px] border border-white/10 bg-[linear-gradient(145deg,rgba(9,20,38,0.98),rgba(15,35,59,0.92))] p-8 shadow-[0_30px_80px_rgba(2,6,23,0.48)]">
            <UrologicsBrand compact product="Grand Mocks" tag="Candidate registration" />
            <div className="mt-6 text-2xl font-bold text-white">{selectedMock.title}</div>
            <p className="mt-3 text-sm leading-7 text-slate-200">
              Enter your details to continue.
            </p>
            <div className="mt-6 space-y-4">
              <div>
                <label className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
                  <ShieldCheck size={14} />
                  Full Name
                </label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter your name" className="urologics-input" />
              </div>
              <div>
                <label className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
                  <Mail size={14} />
                  Email
                </label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter your email" className="urologics-input" />
              </div>
            </div>
            <div className="mt-8 flex gap-3">
              <button onClick={() => setSelectedMock(null)} className="inline-flex flex-1 items-center justify-center rounded-full border border-white/12 bg-white/[0.06] px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/[0.1]">
                Cancel
              </button>
              <button onClick={handleContinue} className="inline-flex flex-1 items-center justify-center rounded-full bg-[#7ff0d8] px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-[#9bf5e1]">
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
