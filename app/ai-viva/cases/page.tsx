"use client";

import React, { useEffect, useState } from "react";
import { ArrowRight, Clock3, Filter, Flame, LockKeyhole, Search, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/components/auth/AuthProvider";
import type { VivaCaseRecord } from "@/lib/viva-case";
import UrologicsHeader from "@/components/brand/UrologicsHeader";
import { appPath } from "@/lib/app-path";

type VivaMode = "calm" | "fast";
type VivaCaseWithAccess = VivaCaseRecord & {
  accessType?: "public" | "restricted";
  access?: {
    allowed?: boolean;
    reason?: string;
    isPublic?: boolean;
  };
};
type VivaCredit = {
  totalMinutes: number;
  usedMinutes: number;
  remainingMinutes: number;
  percentRemaining: number;
};

const VivaCasesPage: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const [cases, setCases] = useState<VivaCaseWithAccess[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [selectedModes, setSelectedModes] = useState<Record<string, VivaMode>>({});
  const [vivaCredit, setVivaCredit] = useState<VivaCredit | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchCases = async () => {
      if (authLoading) return;

      try {
        setLoading(true);
        const res = user?.idToken
          ? await fetch(appPath("/api/urologics/viva-cases"), {
              headers: {
                Authorization: `Bearer ${user.idToken}`,
              },
              cache: "no-store",
            })
          : await fetch(appPath("/api/public/viva-cases"));

        if (!res.ok) throw new Error("Failed to fetch cases");
        const data = await res.json();
        setCases(data.cases || []);
        setVivaCredit(user?.idToken && data.vivaCredit ? data.vivaCredit : null);
      } catch {
        setError("Failed to load cases");
      } finally {
        setLoading(false);
      }
    };

    void fetchCases();
  }, [authLoading, user?.idToken]);

  function getSelectedMode(viva: VivaCaseRecord): VivaMode {
    return selectedModes[viva.id] || "calm";
  }

  function handleModeChange(viva: VivaCaseRecord, checked: boolean) {
    const nextMode: VivaMode = checked ? "fast" : "calm";
    setSelectedModes((current) => ({
      ...current,
      [viva.id]: nextMode,
    }));
  }

  function isVivaAllowed(viva: VivaCaseWithAccess) {
    if (viva.accessType === "public" || viva.access?.isPublic) return true;
    return viva.access ? Boolean(viva.access.allowed) : true;
  }

  function openCase(viva: VivaCaseWithAccess) {
    if (!isVivaAllowed(viva)) return;

    const selectedMode = getSelectedMode(viva);
    const isPublic = viva.accessType === "public" || viva.access?.isPublic;
    router.push(
      isPublic
        ? `/public-viva/${viva.id}?mode=${selectedMode}&source=ai-viva-cases`
        : `/ai-viva/session/${viva.id}?mode=${selectedMode}`
    );
  }

  const levels = Array.from(new Set(cases.map((c) => c.case.level)));
  const creditPercent = Math.max(0, Math.min(100, vivaCredit?.percentRemaining || 0));
  const isCreditHealthy =
    vivaCredit && vivaCredit.remainingMinutes > Math.max(10, vivaCredit.totalMinutes * 0.2);
  const filteredCases = cases.filter((viva) => {
    const matchesLevel = levelFilter === "all" || viva.case.level === levelFilter;
    const searchLower = search.toLowerCase();
    const matchesSearch =
      viva.case.title.toLowerCase().includes(searchLower) ||
      viva.case.level.toLowerCase().includes(searchLower) ||
      viva.case.objectives.some((obj) => obj.toLowerCase().includes(searchLower));

    return matchesLevel && matchesSearch;
  });

  if (loading) {
    return (
      <main className="urologics-shell flex min-h-screen items-center justify-center">
        <div className="urologics-panel px-8 py-6 text-[var(--text-secondary)]">
          Loading Urologics AI Viva cases...
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="urologics-shell flex min-h-screen items-center justify-center">
        <div className="rounded-[28px] border border-red-500/20 bg-[var(--surface-raised)] px-8 py-6 text-red-600 shadow-[0_16px_40px_var(--shadow-soft)]">
          {error}
        </div>
      </main>
    );
  }

  return (
    <main className="urologics-shell overflow-hidden">
      <div className="mx-auto max-w-7xl px-6 py-6">
        <UrologicsHeader current="AI Viva" product="AI Viva" tag="Case library" />

        <section className="grid gap-8 py-2 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="urologics-panel p-7 md:p-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--accent-soft)] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--accent-strong)]">
              <Sparkles size={14} />
              AI Viva
            </div>
            <h1 className="mt-7 max-w-3xl text-4xl font-semibold tracking-[-0.04em] text-[var(--text-primary)] sm:text-5xl">
              Choose a viva case.
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-8 text-[var(--text-secondary)] md:text-lg">
              Select a case and start in calm or fast mode.
            </p>
          </div>

          <div className="urologics-panel p-7 md:p-8">
            <div className="flex items-center gap-3 text-[var(--accent-strong)]">
              <Sparkles size={18} />
              <span className="text-[11px] font-semibold uppercase tracking-[0.22em]">Filters</span>
            </div>
            <div className="mt-6 grid gap-4">
              <div>
                <label className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                  <Search size={14} />
                  Search
                </label>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by title, level, or objective"
                  className="urologics-input"
                />
              </div>
              <div>
                <label className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                  <Filter size={14} />
                  Level
                </label>
                <select
                  value={levelFilter}
                  onChange={(e) => setLevelFilter(e.target.value)}
                  className="urologics-input"
                >
                  <option value="all">All Levels</option>
                  {levels.map((level) => (
                    <option key={level} value={level}>
                      {level}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </section>

        {user && vivaCredit && vivaCredit.totalMinutes > 0 ? (
          <section className="urologics-panel mb-6 overflow-hidden p-6">
            <div className="flex flex-wrap items-center justify-between gap-5">
              <div className="flex items-center gap-4">
                <div className="grid h-12 w-12 place-items-center rounded-2xl border border-[var(--border)] bg-[var(--accent-soft)] text-[var(--accent-strong)]">
                  <Clock3 size={20} />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-secondary)]">
                    AI Viva Minutes
                  </p>
                  <h2 className="mt-1 text-xl font-semibold text-[var(--text-primary)]">
                    {vivaCredit.remainingMinutes} / {vivaCredit.totalMinutes} minutes left
                  </h2>
                </div>
              </div>
              <div
                className={`rounded-full px-4 py-2 text-sm font-semibold ${
                  isCreditHealthy
                    ? "bg-[var(--accent-soft)] text-[var(--accent-strong)]"
                    : "bg-[#fff3df] text-[#b45309]"
                }`}
              >
                {creditPercent}% remaining
              </div>
            </div>
            <div className="mt-5 h-3 overflow-hidden rounded-full bg-[var(--accent-soft)]">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${creditPercent}%`,
                  backgroundColor: isCreditHealthy ? "var(--accent)" : "#F59E0B",
                }}
              />
            </div>
          </section>
        ) : null}

        {filteredCases.length === 0 ? (
          <div className="urologics-panel p-10 text-center">
            <div className="text-xl font-semibold text-[var(--text-primary)]">No cases found</div>
            <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">Try a wider filter or a simpler search term.</p>
          </div>
        ) : (
          <section className="grid gap-6 pb-16 md:grid-cols-2 xl:grid-cols-3 mt-4">
            {filteredCases.map((viva) => (
             <article
  key={viva.id}
  className={`flex flex-col justify-between rounded-[28px] border border-[var(--border)] bg-[var(--surface-raised)] p-6 shadow-[0_16px_40px_var(--shadow-soft)] transition ${
    isVivaAllowed(viva)
      ? "cursor-pointer hover:-translate-y-1 hover:border-[var(--accent)]"
      : "cursor-not-allowed opacity-75"
  }`}
  onClick={() => openCase(viva)}
  tabIndex={0}
  onKeyDown={(e) => {
    if (e.key === "Enter" || e.key === " ") {
      openCase(viva);
    }
  }}
>
                <div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--accent-soft)] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--accent-strong)]">
  {viva.case.level}
</span>
                    <span className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--text-secondary)]">
  {viva.accessType === "public" || viva.access?.isPublic ? "Public" : isVivaAllowed(viva) ? "Included" : "Locked"}
</span>
                  </div>

                  <h2 className="mt-6 text-2xl font-semibold text-[var(--text-primary)]">
  {viva.case.title}
</h2>
                  <p className="mt-3 line-clamp-4 text-sm leading-7 text-[var(--text-secondary)]">
  {viva.case.stem}
</p>

                  <div
  className="mt-6 rounded-[22px] border border-[var(--border)] bg-[var(--accent-soft)] p-2"
  onClick={(e) => e.stopPropagation()}
>
  <div className="grid grid-cols-2 gap-2">
    <button
      type="button"
      onClick={() => handleModeChange(viva, false)}
      className={`rounded-[18px] px-4 py-3 text-sm font-semibold transition ${
        getSelectedMode(viva) === "calm"
          ? "bg-[var(--accent)] text-[var(--accent-text)] shadow-[0_12px_28px_var(--shadow-brand)]"
          : "text-[var(--accent-strong)] hover:bg-[var(--surface-raised)]"
      }`}
    >
      Calm & Composed
    </button>

    <button
      type="button"
      onClick={() => handleModeChange(viva, true)}
      disabled={!viva.modes?.fastAndFurious?.enabled}
      className={`rounded-[18px] px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-45 ${
        getSelectedMode(viva) === "fast"
          ? "bg-[#F59E0B] text-white shadow-[0_12px_28px_rgba(245,158,11,0.28)]"
          : "text-[#b45309] hover:bg-[#fff3df]"
      }`}
    >
      <span className="inline-flex items-center justify-center gap-2">
        <Flame size={15} />
        Fast & Furious
      </span>
    </button>
  </div>
</div>

                  <div className="mt-6 space-y-2.5">
                    {viva.case.objectives.slice(0, 3).map((objective, objectiveIndex) => (
                      <div key={objectiveIndex} className={`flex gap-3 text-sm text-[var(--text-secondary)]`}>
                        <span className={`mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-[var(--accent)]`} />
                        <span className="leading-6">{objective}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  disabled={!isVivaAllowed(viva)}
                  className={`mt-8 inline-flex w-full items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition ${
                    isVivaAllowed(viva)
                      ? "bg-[var(--accent)] text-[var(--accent-text)] hover:bg-[var(--accent-hover)]"
                      : "cursor-not-allowed border border-[var(--border)] bg-[var(--accent-soft)] text-[var(--accent-strong)]"
                  }`}
                  onClick={(e) => {
                    localStorage.removeItem("candidateInfo");
                    e.stopPropagation();
                    openCase(viva);
                  }}
                >
                  {isVivaAllowed(viva) ? "Start Urologics AI Viva" : viva.access?.reason || "Locked"}
                  {isVivaAllowed(viva) ? <ArrowRight size={16} /> : <LockKeyhole size={16} />}
                </button>
              </article>
            ))}
          </section>
        )}
      </div>
    </main>
  );
};

export default VivaCasesPage;
