"use client";

import React, { useEffect, useState } from "react";
import { ArrowRight, Filter, LockKeyhole, Search, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/components/auth/AuthProvider";
import type { VivaCaseRecord } from "@/lib/viva-case";
import UrologicsHeader from "@/components/brand/UrologicsHeader";

type VivaMode = "calm" | "fast";
type VivaCaseWithAccess = VivaCaseRecord & {
  accessType?: "public" | "restricted";
  access?: {
    allowed?: boolean;
    reason?: string;
    isPublic?: boolean;
  };
};

const VivaCasesPage: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const [cases, setCases] = useState<VivaCaseWithAccess[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [selectedModes, setSelectedModes] = useState<Record<string, VivaMode>>({});
  const router = useRouter();

  useEffect(() => {
    const fetchCases = async () => {
      if (authLoading) return;

      try {
        setLoading(true);
        const res = user?.idToken
          ? await fetch("/api/urologics/viva-cases", {
              headers: {
                Authorization: `Bearer ${user.idToken}`,
              },
              cache: "no-store",
            })
          : await fetch("/api/public/viva-cases");

        if (!res.ok) throw new Error("Failed to fetch cases");
        const data = await res.json();
        setCases(data.cases || []);
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
        <div className="urologics-panel px-8 py-6 text-[#071014]/65">
          Loading Urologics AI Viva cases...
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="urologics-shell flex min-h-screen items-center justify-center">
        <div className="rounded-[28px] border border-red-500/20 bg-white px-8 py-6 text-red-600 shadow-[0_16px_40px_rgba(15,120,150,0.09)]">
          {error}
        </div>
      </main>
    );
  }

  return (
    <main className="urologics-shell overflow-hidden">
      <div className="mx-auto max-w-7xl px-6 py-6">
        <UrologicsHeader current="AI Viva" product="AI Viva" tag="Case library" />

        <section className="grid gap-8 py-24 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="urologics-panel p-7 md:p-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#0f7896]/12 bg-cyan-50 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#0f7896]">
              <Sparkles size={14} />
              AI Viva
            </div>
            <h1 className="mt-7 max-w-3xl text-4xl font-semibold tracking-[-0.04em] text-[#071014] sm:text-5xl">
              Choose a viva case.
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-8 text-[#071014]/65 md:text-lg">
              Select a case and start in calm or fast mode.
            </p>
          </div>

          <div className="urologics-panel p-7 md:p-8">
            <div className="flex items-center gap-3 text-[#0f7896]">
              <Sparkles size={18} />
              <span className="text-[11px] font-semibold uppercase tracking-[0.22em]">Filters</span>
            </div>
            <div className="mt-6 grid gap-4">
              <div>
                <label className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#071014]/65">
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
                <label className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#071014]/65">
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

        {filteredCases.length === 0 ? (
          <div className="urologics-panel p-10 text-center">
            <div className="text-xl font-semibold text-[#071014]">No cases found</div>
            <p className="mt-3 text-sm leading-7 text-[#071014]/65">Try a wider filter or a simpler search term.</p>
          </div>
        ) : (
          <section className="grid gap-6 pb-16 md:grid-cols-2 xl:grid-cols-3">
            {filteredCases.map((viva) => (
             <article
  key={viva.id}
  className={`flex flex-col justify-between rounded-[28px] border border-[#0f7896]/12 bg-white p-6 shadow-[0_16px_40px_rgba(15,120,150,0.09)] transition ${
    isVivaAllowed(viva)
      ? "cursor-pointer hover:-translate-y-1 hover:border-[#0f7896]/30"
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
                    <span className="inline-flex items-center rounded-full border border-[#0f7896]/15 bg-cyan-50 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#0f7896]">
  {viva.case.level}
</span>
                    <span className="text-xs font-medium uppercase tracking-[0.18em] text-[#071014]/65">
  {viva.accessType === "public" || viva.access?.isPublic ? "Public" : isVivaAllowed(viva) ? "Included" : "Locked"}
</span>
                  </div>

                  <h2 className="mt-6 text-2xl font-semibold text-[#071014]">
  {viva.case.title}
</h2>
                  <p className="mt-3 line-clamp-4 text-sm leading-7 text-[#071014]/65">
  {viva.case.stem}
</p>

                  <div
  className="mt-6 rounded-[22px] border border-[#0f7896]/12 bg-cyan-50 p-2"
  onClick={(e) => e.stopPropagation()}
>
  <div className="grid grid-cols-2 gap-2">
    <button
      type="button"
      onClick={() => handleModeChange(viva, false)}
      className={`rounded-[18px] px-4 py-3 text-sm font-semibold transition ${
        getSelectedMode(viva) === "calm"
          ? "bg-[#0f7896] text-white shadow-[0_12px_28px_rgba(15,120,150,0.22)]"
          : "text-[#0f7896] hover:bg-white"
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
          ? "bg-[#0f7896] text-white shadow-[0_12px_28px_rgba(15,120,150,0.22)]"
          : "text-[#0f7896] hover:bg-white"
      }`}
    >
      Fast & Furious
    </button>
  </div>
</div>

                  <div className="mt-6 space-y-2.5">
                    {viva.case.objectives.slice(0, 3).map((objective, objectiveIndex) => (
                      <div key={objectiveIndex} className={`flex gap-3 text-sm text-[#071014]/75`}>
                        <span className={`mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-[#0f7896]`} />
                        <span className="leading-6">{objective}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  disabled={!isVivaAllowed(viva)}
                  className={`mt-8 inline-flex w-full items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition ${
                    isVivaAllowed(viva)
                      ? "bg-[#0f7896] text-white hover:bg-[#0b6078]"
                      : "cursor-not-allowed border border-[#0f7896]/12 bg-cyan-50 text-[#0f7896]"
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
