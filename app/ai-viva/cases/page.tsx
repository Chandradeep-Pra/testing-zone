"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Clock3,
  Filter,
  FolderOpen,
  LockKeyhole,
  Search,
  Sparkles,
  Zap,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/components/auth/AuthProvider";
import type { VivaCaseRecord } from "@/lib/viva-case";
import UrologicsHeader from "@/components/brand/UrologicsHeader";
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
        cases: [viva],
      });
    });

    return Array.from(groups.values()).sort((left, right) => {
      if (left.key === UNFILED_FOLDER_KEY) return 1;
      if (right.key === UNFILED_FOLDER_KEY) return -1;
      return left.name.localeCompare(right.name);
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
          <GlobalLoading label="Loading Urologics AI Viva cases..." />
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
      <div className="mobile-native-page mx-auto max-w-7xl sm:px-6 sm:py-6">
        <UrologicsHeader current="AI Viva" product="AI Viva" tag="Case library" />

        <section className="grid gap-4 py-2 sm:gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="urologics-panel p-5 sm:p-7 md:p-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--accent-soft)] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--accent-strong)]">
              <Sparkles size={14} />
              AI Viva
            </div>
            <h1 className="mobile-native-title mt-6 max-w-3xl font-semibold text-[var(--text-primary)] sm:mt-7 sm:text-5xl sm:tracking-[-0.04em]">
              Choose a viva case.
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--text-secondary)] sm:mt-5 sm:text-base sm:leading-8 md:text-lg">
              Select a case and start in calm or fast mode.
            </p>
          </div>

          <div className="urologics-panel p-5 sm:p-7 md:p-8">
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

        <section className="grid gap-4 pb-16 sm:gap-5 lg:grid-cols-[340px_1fr]">
          <aside className="urologics-panel h-fit overflow-hidden p-3 lg:sticky lg:top-4 lg:max-h-[calc(100vh-120px)]">
            <div className="mb-3 px-1">
              <div className="inline-flex items-center gap-2 rounded-full bg-[var(--accent-soft)] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--accent-strong)]">
                <FolderOpen className="h-3.5 w-3.5" />
                AI Viva folders
              </div>
              <p className="mt-2 text-xs text-[var(--text-secondary)]">
                {visibleCases.filter(isVivaAllowed).length}/{visibleCases.length} accessible
              </p>
            </div>

            <div className="urologics-thin-scrollbar flex max-h-[172px] gap-2 overflow-x-auto overflow-y-hidden pr-1 lg:block lg:max-h-[calc(100vh-220px)] lg:space-y-2 lg:overflow-y-auto">
              {allFolderGroups.length === 0 ? (
                <div className="rounded-[22px] bg-[var(--accent-soft)] p-4 text-sm text-[var(--text-secondary)]">
                  No viva folders found.
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setSelectedFolderKey("all")}
                    className={`flex min-w-[190px] items-center gap-3 rounded-[22px] border px-3 py-3 text-left transition lg:w-full lg:min-w-0 ${
                      selectedFolderKey === "all"
                        ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                        : "border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--accent-soft)]"
                    }`}
                  >
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-[var(--surface-raised)] text-[var(--accent-strong)]">
                      <Sparkles className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-[var(--text-primary)]">
                        All
                      </span>
                      <span className="mt-0.5 block text-xs text-[var(--text-tertiary)]">
                        {filteredCases.length} cases
                      </span>
                    </span>
                  </button>

                  {allFolderGroups.map((folder) => {
                    const selected = selectedFolderKey === folder.key;
                    const matchingCount = filteredCases.filter((viva) => {
                      const folderName = String(viva.folderName || "").trim();
                      const key = String(viva.folderId || folderName || UNFILED_FOLDER_KEY).trim();
                      return key === folder.key;
                    }).length;

                    return (
                      <button
                        key={folder.key}
                        type="button"
                        onClick={() => setSelectedFolderKey(folder.key)}
                        className={`flex min-w-[220px] items-center gap-3 rounded-[22px] border px-3 py-3 text-left transition lg:w-full lg:min-w-0 ${
                          selected
                            ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                            : "border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--accent-soft)]"
                        }`}
                      >
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-[var(--surface-raised)] text-[var(--accent-strong)]">
                          <FolderOpen className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-[var(--text-primary)]">
                            {folder.name}
                          </span>
                          <span className="mt-0.5 block text-xs text-[var(--text-tertiary)]">
                            {matchingCount} cases
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </>
              )}
            </div>
          </aside>

          {visibleCases.length === 0 ? (
            <div className="urologics-panel p-10 text-center">
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

              <div className="grid min-w-0 gap-4 sm:gap-6 xl:grid-cols-2">
              {visibleCases.map((viva) => (
                <article
  key={viva.id}
  className={`flex w-full min-w-0 max-w-full flex-col justify-between overflow-hidden rounded-[28px] border border-[var(--border)] bg-[var(--surface-raised)] p-4 shadow-[0_16px_40px_var(--shadow-soft)] transition sm:p-6 ${
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

                  <h2 className="mt-5 line-clamp-2 break-words text-xl font-semibold text-[var(--text-primary)] sm:mt-6 sm:text-2xl">
  {viva.case.title}
</h2>
                  {viva.folderName ? (
                    <div className="mt-3 inline-flex max-w-full items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)]">
                      <FolderOpen size={14} className="shrink-0 text-[var(--accent-strong)]" />
                      <span className="truncate">{viva.folderName}</span>
                    </div>
                  ) : null}
                  <p className="mt-3 line-clamp-1 min-w-0 break-words text-sm font-semibold leading-6 text-[var(--text-secondary)]">
  {viva.case.stem}
</p>

                  <div
  className="mt-5 min-w-0 rounded-[22px] border border-[var(--border)] bg-[var(--accent-soft)] p-2 sm:mt-6"
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

                  <div className="mt-6 space-y-2.5">
                    {viva.case.objectives.slice(0, 3).map((objective, objectiveIndex) => (
                      <div key={objectiveIndex} className={`flex min-w-0 gap-3 text-sm text-[var(--text-secondary)]`}>
                        <span className={`mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-[var(--accent)]`} />
                        <span className="min-w-0 break-words leading-6">{objective}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  className={`mt-8 inline-flex w-full items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition ${
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
