"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Clock3,
  Filter,
  LockKeyhole,
  Search,
  Sparkles,
  Zap,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/components/auth/AuthProvider";
import UrologicsHeader from "@/components/brand/UrologicsHeader";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { VivaCaseRecord } from "@/lib/viva-case";
import GlobalLoading from "@/components/ui/GlobalLoading";
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
const PRICING_URL = "https://urologics.co.uk/pricing";
const UNFILED_FOLDER_KEY = "unfiled";
const UNFILED_FOLDER_NAME = "Unfiled Viva Cases";
const AI_SIMULATION_EMAILS = new Set([
  "chadnradeepp611@gmail.com",
  "chandradeepp611@gmail.com",
  "ankitgoel042@gmail.com",
]);

const VivaCasesPage: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const [cases, setCases] = useState<VivaCaseWithAccess[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [selectedModes, setSelectedModes] = useState<Record<string, VivaMode>>({});
  const [selectedFolderKey, setSelectedFolderKey] = useState("all");
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

  function canRunAiSimulation() {
    const email = user?.email?.trim().toLowerCase() || "";
    return AI_SIMULATION_EMAILS.has(email) || email.endsWith("@urologics.co.uk");
  }

  function openCase(viva: VivaCaseWithAccess) {
    if (!isVivaAllowed(viva)) {
      window.open(PRICING_URL, "_blank", "noopener,noreferrer");
      return;
    }

    const selectedMode = getSelectedMode(viva);
    const isPublic = viva.accessType === "public" || viva.access?.isPublic;
    router.push(
      isPublic
        ? `/public-viva/${viva.id}?mode=${selectedMode}&source=ai-viva-cases`
        : `/ai-viva/session/${viva.id}?mode=${selectedMode}`
    );
  }

  function openAiSimulation(viva: VivaCaseWithAccess) {
    if (!isVivaAllowed(viva) || !canRunAiSimulation()) return;
    const selectedMode = getSelectedMode(viva);
    router.push(`/ai-viva/session/${viva.id}?mode=${selectedMode}&ai=1`);
  }

  const levels = Array.from(new Set(cases.map((c) => c.case.level)));
  const creditPercent = Math.max(0, Math.min(100, vivaCredit?.percentRemaining || 0));
  const filteredCases = cases.filter((viva) => {
    const matchesLevel = levelFilter === "all" || viva.case.level === levelFilter;
    const searchLower = search.toLowerCase();
    const matchesSearch =
      viva.case.title.toLowerCase().includes(searchLower) ||
      viva.case.level.toLowerCase().includes(searchLower) ||
      viva.case.objectives.some((obj) => obj.toLowerCase().includes(searchLower));

    return matchesLevel && matchesSearch;
  });
  const allFolderGroups = useMemo(() => {
    const groups = new Map<
      string,
      {
        key: string;
        name: string;
        sortOrder: number;
        cases: VivaCaseWithAccess[];
      }
    >();

    cases.forEach((viva) => {
      const folderName = String(viva.folderName || "").trim();
      const key = String(viva.folderId || folderName || UNFILED_FOLDER_KEY).trim();
      const name = folderName || UNFILED_FOLDER_NAME;
      const existing = groups.get(key);

      if (existing) {
        existing.cases.push(viva);
        return;
      }

      groups.set(key, {
        key,
        name,
        sortOrder: viva.folderSortOrder ?? Number.MAX_SAFE_INTEGER,
        cases: [viva],
      });
    });

    return Array.from(groups.values()).sort((left, right) => {
      if (left.key === UNFILED_FOLDER_KEY) return 1;
      if (right.key === UNFILED_FOLDER_KEY) return -1;
      return left.sortOrder - right.sortOrder || left.name.localeCompare(right.name);
    });
  }, [cases]);

  const visibleCases =
    selectedFolderKey === "all"
      ? filteredCases
      : filteredCases.filter((viva) => {
          const folderName = String(viva.folderName || "").trim();
          const key = String(viva.folderId || folderName || UNFILED_FOLDER_KEY).trim();
          return key === selectedFolderKey;
        });

  const selectedFolderName =
    selectedFolderKey === "all"
      ? "All AI Viva Cases"
      : allFolderGroups.find((folder) => folder.key === selectedFolderKey)?.name || "AI Viva Cases";

  if (loading) {
    return (
      <main className="urologics-shell flex min-h-screen items-center justify-center">
        <div className="urologics-panel px-8 py-8">
          <GlobalLoading  />
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
      <div className="mobile-native-page mx-auto max-w-7xl px-2 pb-8 sm:px-3 sm:py-4">
        <UrologicsHeader current="AI Viva" product="Urologics AI" tag="Case library" />

        <section className="mb-4 rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-3 sm:mb-5 sm:p-4">
          <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => setSelectedFolderKey("all")}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                selectedFolderKey === "all"
                  ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-text)]"
                  : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] hover:bg-[var(--accent-soft)]"
              }`}
            >
              All cases
            </button>
            {allFolderGroups.map((folder) => (
              <button
                key={folder.key}
                type="button"
                onClick={() => setSelectedFolderKey(folder.key)}
                className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                  selectedFolderKey === folder.key
                    ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-text)]"
                    : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] hover:bg-[var(--accent-soft)]"
                }`}
              >
                {folder.name}
              </button>
            ))}
          </div>
          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_190px]">
            <label className="relative block">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search cases, levels, or objectives"
                aria-label="Search viva cases"
                className="urologics-input !py-2.5 !pl-9"
              />
            </label>
            <div className="relative">
              <Filter size={15} className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-[var(--text-tertiary)]" />
              <Select value={levelFilter} onValueChange={setLevelFilter}>
                <SelectTrigger
                  aria-label="Filter by level"
                  className="urologics-input !h-auto !rounded-2xl !border-[var(--border)] !bg-[var(--surface)] !px-4 !py-2.5 !pl-9 !pr-10 !text-base shadow-none focus-visible:!border-[var(--accent)] focus-visible:!bg-[var(--surface-raised)] focus-visible:!ring-4 focus-visible:!ring-[var(--focus)]"
                >
                  <SelectValue placeholder="All Levels" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  {levels.map((level) => (
                    <SelectItem key={level} value={level}>{level}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </section>

        {user && vivaCredit && vivaCredit.totalMinutes > 0 ? (
          <section className="urologics-panel mb-4 overflow-hidden p-4">
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
                className="rounded-full bg-[var(--accent-soft)] px-4 py-2 text-sm font-semibold text-[var(--accent-strong)]"
              >
                {creditPercent}% remaining
              </div>
            </div>
            <div className="mt-5 h-3 overflow-hidden rounded-full bg-[var(--accent-soft)]">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${creditPercent}%`,
                  backgroundColor: "var(--accent)",
                }}
              />
            </div>
          </section>
        ) : null}

        <section className="pb-12">
          {visibleCases.length === 0 ? (
                    <div className="urologics-panel p-6 text-center sm:p-8">
              <div className="text-xl font-semibold text-[var(--text-primary)]">No cases found</div>
              <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">Try a wider filter or a simpler search term.</p>
            </div>
          ) : (
            <div className="min-w-0">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">
                    {selectedFolderName}
                  </p>
                  <h2 className="mt-1 text-2xl font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
                    {visibleCases.length} viva cases
                  </h2>
                </div>
              </div>

              <div className="grid min-w-0 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
              {visibleCases.map((viva) => (
                <article
  key={viva.id}
  className={`flex w-full min-w-0 max-w-full flex-col justify-between overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-3 shadow-[0_8px_22px_var(--shadow-soft)] transition sm:p-4 ${
    isVivaAllowed(viva)
      ? "cursor-pointer hover:-translate-y-1 hover:border-[var(--accent)]"
      : "cursor-pointer opacity-75 hover:-translate-y-1 hover:border-amber-300"
  }`}
  onClick={() => openCase(viva)}
  tabIndex={0}
  onKeyDown={(e) => {
    if (e.key === "Enter" || e.key === " ") {
      openCase(viva);
    }
  }}
>
                <div className="min-w-0">
                  <div className="flex min-w-0 items-center justify-between gap-3">
                    <span className="inline-flex min-w-0 max-w-[62%] items-center truncate rounded-full border border-[var(--border)] bg-[var(--accent-soft)] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--accent-strong)] sm:max-w-none sm:tracking-[0.22em]">
  {viva.case.level}
</span>
                    <span className="shrink-0 text-xs font-medium uppercase tracking-[0.14em] text-[var(--text-secondary)] sm:tracking-[0.18em]">
  {viva.accessType === "public" || viva.access?.isPublic ? "Public" : isVivaAllowed(viva) ? "Included" : "Locked"}
</span>
                  </div>

                  <h2 className="mt-3 line-clamp-2 break-words text-lg font-semibold text-[var(--text-primary)] sm:text-xl">
  {viva.case.title}
</h2>
                  <p className="mt-3 line-clamp-1 min-w-0 break-words text-sm font-semibold leading-6 text-[var(--text-secondary)]">
  {viva.case.stem}
</p>

                  <div
  className="mt-3 min-w-0 rounded-lg border border-[var(--border)] bg-[var(--accent-soft)] p-1.5"
  onClick={(e) => e.stopPropagation()}
>
  <div className="grid min-w-0 grid-cols-1 gap-2 min-[420px]:grid-cols-2">
    <button
      type="button"
      onClick={() => handleModeChange(viva, false)}
      className={`min-w-0 rounded-[18px] px-3 py-3 text-xs font-semibold leading-5 transition sm:px-4 sm:text-sm ${
        getSelectedMode(viva) === "calm"
          ? "bg-[var(--accent)] text-[var(--accent-text)] shadow-[0_12px_28px_var(--shadow-brand)]"
          : "text-[var(--accent-strong)] hover:bg-[var(--surface-raised)]"
      }`}
    >
      <span className="block truncate min-[420px]:whitespace-normal">Calm & Composed</span>
    </button>

    <button
      type="button"
      onClick={() => handleModeChange(viva, true)}
      disabled={!viva.modes?.fastAndFurious?.enabled}
      className={`min-w-0 rounded-[18px] px-3 py-3 text-xs font-semibold leading-5 transition disabled:cursor-not-allowed disabled:opacity-45 sm:px-4 sm:text-sm ${
        getSelectedMode(viva) === "fast"
          ? "bg-[#FF6347] text-white shadow-[0_12px_28px_rgba(255,99,71,0.3)]"
          : "text-[var(--accent-strong)] hover:bg-[var(--surface-raised)]"
      }`}
    >
      <span className="inline-flex min-w-0 items-center justify-center gap-2">
        <Zap size={15} className="shrink-0" />
        <span className="truncate min-[420px]:whitespace-normal">Fast & Furious</span>
      </span>
    </button>
  </div>
</div>

                  {canRunAiSimulation() && isVivaAllowed(viva) ? (
                    <button
                      type="button"
                      className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full border border-[var(--accent)]/35 bg-[var(--accent-soft)] px-5 py-2.5 text-xs font-semibold text-[var(--accent-strong)] transition hover:border-[var(--accent)] hover:bg-[var(--surface-raised)]"
                      onClick={(e) => {
                        e.stopPropagation();
                        openAiSimulation(viva);
                      }}
                    >
                      <Sparkles size={14} />
                      Run AI simulated Viva
                    </button>
                  ) : null}

                  <div className="mt-4 space-y-2">
                    {viva.case.objectives.slice(0, 3).map((objective, objectiveIndex) => (
                      <div key={objectiveIndex} className={`flex min-w-0 gap-3 text-sm text-[var(--text-secondary)]`}>
                        <span className={`mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-[var(--accent)]`} />
                        <span className="min-w-0 break-words leading-6">{objective}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  className={`mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition ${
                    isVivaAllowed(viva)
                      ? "bg-[var(--accent)] text-[var(--accent-text)] hover:bg-[var(--accent-hover)]"
                      : "border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
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
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
};

export default VivaCasesPage;
