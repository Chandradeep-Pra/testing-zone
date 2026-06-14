"use client";

import { CalendarClock, CircleDot, Mail, ShieldCheck, Sparkles, TimerReset } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

import UrologicsBrand from "@/components/brand/UrologicsBrand";
import UrologicsHeader from "@/components/brand/UrologicsHeader";
import { appPath } from "@/lib/app-path";

type TimestampLike = {
  _seconds?: number;
};

interface Mock {
  id: string;
  quizId: string;
  title: string;
  accessType?: "private" | "public" | string;
  startTime: string | number | TimestampLike;
  endTime?: string | number | TimestampLike;
  durationMinutes: number;
}

type MockAttempt = {
  candidate?: {
    email?: string;
  };
};

const getTimestamp = (value?: string | number | TimestampLike) => {
  if (typeof value === "object" && value?._seconds) {
    return value._seconds * 1000;
  }

  return typeof value === "string" || typeof value === "number"
    ? new Date(value).getTime()
    : 0;
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
        const res = await fetch(appPath("/api/mocks"));
        const data = (await res.json()) as { mocks?: Mock[] };

        const filtered = (data.mocks || []).filter((mock) => {
          const start = getTimestamp(mock.startTime);
          const end = getTimestamp(mock.endTime) || start + mock.durationMinutes * 60 * 1000;
          const now = Date.now();

          return Boolean(start && end && now >= start && now <= end);
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

  const handleContinue = async () => {
    const trimmedName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();

    if (!trimmedName || !normalizedEmail || !selectedMock) {
      return;
    }

    try {
      const res = await fetch(appPath(`/api/mocks/${selectedMock.id}`));
      const data = (await res.json()) as { mock?: { attempts?: MockAttempt[] }; attempts?: MockAttempt[] };
      const attempts = Array.isArray(data.mock?.attempts)
        ? data.mock.attempts
        : Array.isArray(data.attempts)
          ? data.attempts
          : [];

      const alreadyAttempted = attempts.some(
        (attempt) =>
          String(attempt?.candidate?.email || "").trim().toLowerCase() === normalizedEmail
      );

      if (alreadyAttempted) {
        toast.error("This email has already been used for this mock");
        return;
      }

      localStorage.setItem(
        "mockUser",
        JSON.stringify({ name: trimmedName, email: normalizedEmail })
      );
      if (selectedMock.accessType === "public") {
        router.push(`/public-mocks/${selectedMock.id}`);
        return;
      }

      router.push(`/mocks/${selectedMock.id}/rules`);
    } catch (error) {
      console.error("Failed to validate mock attempt:", error);
      toast.error("Unable to verify this mock right now");
    }
  };

  return (
    <main className="urologics-shell overflow-hidden">
      <div className="mobile-native-page mx-auto max-w-7xl sm:px-6 sm:py-6">
        <UrologicsHeader current="Mocks" product="Grand Mocks" tag="Timed practice with premium exam-day polish" />

        <section className="grid gap-4 py-4 sm:gap-8 sm:py-10 md:py-8 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="urologics-panel p-5 sm:p-7 md:p-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--accent-soft)] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)] sm:px-4 sm:text-[11px] sm:tracking-[0.22em]">
              <Sparkles size={14} />
              Mocks
            </div>

            <h1 className="mobile-native-title mt-6 max-w-3xl font-semibold text-[var(--text-primary)] sm:mt-7 sm:text-4xl sm:tracking-[-0.04em] md:text-5xl">
              Timed mock sessions.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--text-secondary)] sm:mt-5 sm:text-base sm:leading-8 md:text-lg">
              Join today&apos;s mock or grand mock.
            </p>

            <div className="mobile-horizontal-snap mt-6 md:mt-7 md:grid md:grid-cols-3 md:gap-4 md:overflow-visible">
              <div className="urologics-subpanel p-4 sm:p-5">
                <CalendarClock className="text-[var(--accent-strong)]" size={18} />
                <div className="mt-3 text-sm font-semibold text-[var(--text-primary)]">Today</div>
                <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">Active sessions only.</p>
              </div>
              <div className="urologics-subpanel p-4 sm:p-5">
                <TimerReset className="text-[var(--accent-strong)]" size={18} />
                <div className="mt-3 text-sm font-semibold text-[var(--text-primary)]">Timed</div>
                <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">Simple timed flow.</p>
              </div>
              <div className="urologics-subpanel p-4 sm:p-5">
                <ShieldCheck className="text-[var(--accent-strong)]" size={18} />
                <div className="mt-3 text-sm font-semibold text-[var(--text-primary)]">Ready</div>
                <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">Built for exam prep.</p>
              </div>
            </div>
          </div>

          <div className="urologics-panel p-5 sm:p-7 md:p-8">
            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--accent-strong)]">
              Sessions
            </div>
            <div className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-[var(--text-primary)] sm:mt-4 sm:text-3xl">
              {loading ? "Loading mock schedule" : `${mocks.length} live sessions now`}
            </div>
            <div className="urologics-thin-scrollbar mt-4 max-h-[272px] space-y-3 overflow-y-auto pr-1 sm:mt-5 sm:pr-2">
              {loading ? (
                <div className="rounded-[22px] border border-[var(--border)] bg-[var(--accent-soft)] p-4 text-sm text-[var(--text-secondary)]">
                  Starting the test
                </div>
              ) : mocks.length === 0 ? (
                <div className="rounded-[22px] border border-[var(--border)] bg-[var(--accent-soft)] p-4 text-sm leading-6 text-[var(--text-secondary)]">
                  No live sessions right now.
                </div>
              ) : (
                mocks.map((mock) => {
                  const endTime =
                    getTimestamp(mock.endTime) ||
                    getTimestamp(mock.startTime) + mock.durationMinutes * 60 * 1000;

                  return (
                    <button
                      key={`session-summary-${mock.id}`}
                      type="button"
                      onClick={() => setSelectedMock(mock)}
                      className="w-full rounded-[22px] border border-[var(--border)] bg-[var(--surface)] p-4 text-left transition hover:-translate-y-1 hover:border-[var(--accent)]"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--accent-soft)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--accent-strong)]">
                          <CircleDot size={9} />
                          Live
                        </span>
                        <span className="text-[11px] uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
                          {mock.durationMinutes} min
                        </span>
                      </div>
                      <div className="mt-3 text-sm font-semibold text-[var(--text-primary)]">
                        {mock.title || "Grand Mock"}
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <span className="rounded-full border border-[var(--border)] bg-[var(--accent-soft)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--accent-strong)]">
                          {mock.accessType === "public" ? "Public" : "Members"}
                        </span>
                      </div>
                      <div className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">
                        Ends {new Date(endTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </section>

        <section className="pb-16">
          <div className="mb-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--accent-strong)] sm:mb-5">
            All Sessions
          </div>
          {loading ? (
            <div className="urologics-panel p-8 text-center text-[var(--text-secondary)] sm:p-10">
              Loading scheduled mocks...
            </div>
          ) : mocks.length === 0 ? (
            <div className="urologics-panel p-8 text-center sm:p-10">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent-strong)]">
                <CalendarClock size={20} />
              </div>
              <div className="text-xl font-semibold text-[var(--text-primary)]">No live sessions now</div>
              <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
                New sessions will appear here.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 md:gap-6 xl:grid-cols-3">
              {mocks.map((mock) => (
                <div
                  key={mock.id}
                  className="urologics-panel p-5 sm:p-6"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--accent-soft)] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--accent-strong)]">
                      <CircleDot size={10} />
                      Live Today
                    </span>
                    <span className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                      {mock.durationMinutes} min
                    </span>
                  </div>
                  <h2 className="mt-4 text-xl font-semibold text-[var(--text-primary)] sm:mt-5 sm:text-2xl">{mock.title || "Grand Mock"}</h2>
                  <div className="mt-3 inline-flex rounded-full border border-[var(--border)] bg-[var(--accent-soft)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--accent-strong)]">
                    {mock.accessType === "public" ? "Public access" : "Members only"}
                  </div>
                  <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
                    Available until{" "}
                    {new Date(
                      getTimestamp(mock.endTime) || getTimestamp(mock.startTime) + mock.durationMinutes * 60 * 1000
                    ).toLocaleString()}
                  </p>
                  <button
                    onClick={() => setSelectedMock(mock)}
                    className="urologics-button-primary mt-7 w-full sm:mt-8"
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
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-3 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="w-full max-w-lg rounded-t-[28px] border border-[var(--border)] bg-[var(--surface-raised)] p-6 shadow-[0_24px_60px_var(--shadow-medium)] sm:rounded-[28px] sm:p-8">
            <UrologicsBrand compact product="Grand Mocks" tag="Candidate registration" />
            <div className="mt-5 text-2xl font-semibold text-[var(--text-primary)]">{selectedMock.title}</div>
            <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
              Enter your details to continue.
            </p>
            <div className="mt-6 space-y-4">
              <div>
                <label className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                  <ShieldCheck size={14} />
                  Full Name
                </label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter your name" className="urologics-input" />
              </div>
              <div>
                <label className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                  <Mail size={14} />
                  Email
                </label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter your email" className="urologics-input" />
              </div>
            </div>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <button onClick={() => setSelectedMock(null)} className="urologics-button-secondary flex-1">
                Cancel
              </button>
              <button onClick={handleContinue} className="urologics-button-primary flex-1">
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
