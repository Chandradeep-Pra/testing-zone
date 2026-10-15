"use client";

import {
  ArrowRight,
  BrainCircuit,
  ClipboardCheck,
  ListOrdered,
  LockKeyhole,
  Clock3,
  Trophy,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export type MockItem = {
  id: string;
  title: string;
  description?: string;
  durationMinutes: number;
  questionCount?: number;
  totalQuestions?: number;
  accessType?: string;
  hasAttempted?: boolean;
  userAttempt?: { score?: number; marks?: number };
  access?: { allowed?: boolean; mode?: string; reason?: string | null };
};

export type VivaCase = {
  id: string;
  title: string;
  specialty?: string;
  difficulty?: string;
};

type Tab = "mocks" | "viva";

interface Props {
  mocks: MockItem[];
  vivaCases: VivaCase[];
  mocksLoading: boolean;
  vivaLoading: boolean;
  isLoggedIn: boolean;
}

function MockCard({ mock, onClick }: { mock: MockItem; onClick: () => void }) {
  const entitled =
    mock.accessType === "public" ||
    (mock.access?.allowed === true && mock.access?.mode !== "locked");
  const qCount = mock.questionCount ?? mock.totalQuestions;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onClick(); }}
      className={`flex cursor-pointer items-start justify-between gap-4 rounded-xl border bg-[var(--surface)] px-4 py-3.5 transition hover:-translate-y-0.5 hover:shadow-[0_6px_18px_var(--shadow-soft)] ${
        entitled ? "border-[var(--border)] hover:border-[var(--accent)]" : "border-[var(--border)] opacity-70"
      }`}
    >
      <div className="min-w-0 flex-1">
        <p className="line-clamp-1 font-semibold text-[var(--text-primary)]">{mock.title}</p>
        {mock.description && (
          <p className="mt-0.5 line-clamp-1 text-xs text-[var(--text-secondary)]">
            {mock.description}
          </p>
        )}
        <div className="mt-2 flex flex-wrap gap-2">
          {qCount !== undefined && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-[11px] font-semibold text-[var(--accent-strong)]">
              <ListOrdered size={11} /> {qCount} Qs
            </span>
          )}
          <span className="inline-flex items-center gap-1 rounded-full bg-[var(--surface-muted)] px-2 py-0.5 text-[11px] font-semibold text-[var(--text-secondary)]">
            <Clock3 size={11} /> {mock.durationMinutes} min
          </span>
          {mock.hasAttempted && (
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
              <Trophy size={11} /> Review answers · Score: {mock.userAttempt?.score ?? mock.userAttempt?.marks ?? 0}
            </span>
          )}
        </div>
      </div>
      <div className="shrink-0 pt-0.5 text-[var(--accent-strong)]">
        {entitled ? <ArrowRight size={18} /> : <LockKeyhole size={16} />}
      </div>
    </div>
  );
}

function VivaCard({ viva, onClick }: { viva: VivaCase; onClick: () => void }) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onClick(); }}
      className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3.5 transition hover:-translate-y-0.5 hover:border-[var(--accent)] hover:shadow-[0_6px_18px_var(--shadow-soft)]"
    >
      <div className="min-w-0 flex-1">
        <p className="line-clamp-1 font-semibold text-[var(--text-primary)]">{viva.title}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {viva.specialty && (
            <span className="rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-[11px] font-semibold text-[var(--accent-strong)]">
              {viva.specialty}
            </span>
          )}
          {viva.difficulty && (
            <span className="rounded-full bg-[var(--surface-muted)] px-2 py-0.5 text-[11px] font-semibold text-[var(--text-secondary)]">
              {viva.difficulty}
            </span>
          )}
        </div>
      </div>
      <ArrowRight size={18} className="shrink-0 text-[var(--accent-strong)]" />
    </div>
  );
}

function TabSkeleton() {
  return (
    <div className="space-y-2">
      {[1, 2, 3].map((i) => (
        <div key={i} className="animate-pulse rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3.5">
          <div className="h-3.5 w-2/3 rounded-full bg-[var(--accent-soft)]" />
          <div className="mt-2 h-2.5 w-1/3 rounded-full bg-[var(--accent-soft)]" />
        </div>
      ))}
    </div>
  );
}

export default function TestsTabSection({
  mocks,
  vivaCases,
  mocksLoading,
  vivaLoading,
  isLoggedIn,
}: Props) {
  const [tab, setTab] = useState<Tab>("mocks");
  const router = useRouter();

  return (
    <section className="urologics-panel p-4 sm:p-5">
      {/* Header + tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent-strong)]">
            {tab === "mocks" ? <ClipboardCheck size={18} /> : <BrainCircuit size={18} />}
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--accent-strong)]">
              Tests
            </p>
            <p className="text-xs text-[var(--text-tertiary)]">
              {tab === "mocks" ? "Timed mock sessions" : "AI-powered oral cases"}
            </p>
          </div>
        </div>

        {/* Tab pills */}
        <div className="flex rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-1">
          {(["mocks", "viva"] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition ${
                tab === t
                  ? "bg-[var(--accent)] text-[var(--accent-text)] shadow-sm"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              {t === "mocks" ? "Mocks" : "AI Vivas"}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="mt-4">
        {tab === "mocks" ? (
          mocksLoading ? (
            <TabSkeleton />
          ) : mocks.length === 0 ? (
            <p className="text-sm text-[var(--text-secondary)]">No mocks available right now.</p>
          ) : (
            <div className="space-y-2">
              {mocks.slice(0, 5).map((m) => (
                <MockCard
                  key={m.id}
                  mock={m}
                  onClick={() => router.push(`/mocks/${m.id}/${m.hasAttempted ? "result" : "rules"}`)}
                />
              ))}
              {mocks.length > 5 && (
                <button
                  type="button"
                  onClick={() => router.push("/mocks")}
                  className="mt-1 w-full rounded-xl border border-[var(--border)] py-2 text-sm font-semibold text-[var(--accent-strong)] transition hover:bg-[var(--accent-soft)]"
                >
                  View all {mocks.length} mocks →
                </button>
              )}
            </div>
          )
        ) : vivaLoading ? (
          <TabSkeleton />
        ) : vivaCases.length === 0 ? (
          <p className="text-sm text-[var(--text-secondary)]">
            {isLoggedIn ? "No viva cases available." : "Sign in to access AI viva cases."}
          </p>
        ) : (
          <div className="space-y-2">
            {vivaCases.slice(0, 5).map((v) => (
              <VivaCard
                key={v.id}
                viva={v}
                onClick={() => router.push(`/ai-viva/session/${v.id}`)}
              />
            ))}
            {vivaCases.length > 5 && (
              <button
                type="button"
                onClick={() => router.push("/ai-viva/cases")}
                className="mt-1 w-full rounded-xl border border-[var(--border)] py-2 text-sm font-semibold text-[var(--accent-strong)] transition hover:bg-[var(--accent-soft)]"
              >
                View all {vivaCases.length} cases →
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

