"use client";

import { CalendarClock, Mail, ShieldCheck, Sparkles, TimerReset } from "lucide-react";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";

import UrologicsHeader from "@/components/brand/UrologicsHeader";

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

export default function PublicMockPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [mock, setMock] = useState<Mock | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/public/mocks/${id}`);
        const data = (await res.json()) as { mock?: Mock; error?: string };

        if (!res.ok) {
          toast.error(data?.error || "This mock is not publicly available");
          return;
        }

        setMock(data.mock || null);

        const saved = localStorage.getItem("mockUser");
        if (saved) {
          const parsed = JSON.parse(saved) as { name?: string; email?: string };
          setName(parsed.name || "");
          setEmail(parsed.email || "");
        }
      } catch (err) {
        console.error(err);
        toast.error("Unable to load this mock right now");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [id]);

  const handleContinue = async () => {
    const trimmedName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();

    if (!trimmedName || !normalizedEmail || !mock) {
      return;
    }

    try {
      setSubmitting(true);

      const res = await fetch(`/api/public/mocks/${mock.id}`);
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

      router.push(`/mocks/${mock.id}/rules`);
    } catch (error) {
      console.error("Failed to validate mock attempt:", error);
      toast.error("Unable to verify this mock right now");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <main className="urologics-shell flex min-h-screen items-center justify-center">
        <div className="urologics-panel px-8 py-6 font-semibold text-[var(--text-primary)]">Loading mock...</div>
      </main>
    );
  }

  if (!mock) {
    return (
      <main className="urologics-shell flex min-h-screen items-center justify-center">
        <div className="urologics-panel px-8 py-6 text-[var(--text-secondary)]">
          This mock is not publicly available.
        </div>
      </main>
    );
  }

  const endTime =
    getTimestamp(mock.endTime) || getTimestamp(mock.startTime) + mock.durationMinutes * 60 * 1000;

  return (
    <main className="urologics-shell overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 sm:py-6">
        <UrologicsHeader current="Mocks" product="Grand Mocks" tag="Public candidate registration" />

        <section className="grid gap-6 py-10 sm:gap-8 md:py-24 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="urologics-panel p-5 sm:p-7 md:p-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--accent-soft)] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)] sm:px-4 sm:text-[11px] sm:tracking-[0.22em]">
              <Sparkles size={14} />
              Public Mock
            </div>

            <h1 className="mt-6 max-w-3xl text-3xl font-semibold tracking-[-0.04em] text-[var(--text-primary)] sm:mt-7 sm:text-4xl md:text-5xl">
              {mock.title || "Grand Mock"}
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--text-secondary)] sm:mt-5 sm:text-base sm:leading-8 md:text-lg">
              Enter your details to continue. Your name and email are stored so we can record
              attendance and marks.
            </p>

            <div className="mt-7 grid gap-3 md:grid-cols-3 md:gap-4">
              <div className="urologics-subpanel p-4 sm:p-5">
                <CalendarClock className="text-[var(--accent-strong)]" size={18} />
                <div className="mt-3 text-sm font-semibold text-[var(--text-primary)]">Ends at</div>
                <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                  {new Date(endTime).toLocaleString()}
                </p>
              </div>
              <div className="urologics-subpanel p-4 sm:p-5">
                <TimerReset className="text-[var(--accent-strong)]" size={18} />
                <div className="mt-3 text-sm font-semibold text-[var(--text-primary)]">Duration</div>
                <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                  {mock.durationMinutes} minutes
                </p>
              </div>
              <div className="urologics-subpanel p-4 sm:p-5">
                <ShieldCheck className="text-[var(--accent-strong)]" size={18} />
                <div className="mt-3 text-sm font-semibold text-[var(--text-primary)]">Access</div>
                <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">Public access enabled.</p>
              </div>
            </div>
          </div>

          <div className="urologics-panel p-5 sm:p-7 md:p-8">
            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--accent-strong)]">
              Continue
            </div>
            <div className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-[var(--text-primary)] sm:mt-4 sm:text-3xl">
              Register to start
            </div>
            <div className="mt-5 space-y-4 sm:mt-6">
              <div>
                <label className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                  <ShieldCheck size={14} />
                  Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                  className="urologics-input"
                />
              </div>
              <div>
                <label className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                  <Mail size={14} />
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="urologics-input"
                />
              </div>
            </div>

            <button
              onClick={handleContinue}
              disabled={submitting}
              className="urologics-button-primary mt-7 w-full sm:mt-8"
            >
              {submitting ? "Checking..." : "Continue"}
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
