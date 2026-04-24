"use client";

import React, { useEffect, useState } from "react";
import { ArrowRight, Filter, Search, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";

import { Switch } from "@/components/ui/switch";
import type { VivaCaseRecord } from "@/lib/viva-case";
import UrologicsBrand from "@/components/brand/UrologicsBrand";
import UrologicsNav from "@/components/brand/UrologicsNav";

type VivaMode = "calm" | "fast";

const VivaCasesPage: React.FC = () => {
  const [cases, setCases] = useState<VivaCaseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [selectedModes, setSelectedModes] = useState<Record<string, VivaMode>>({});
  const router = useRouter();

  useEffect(() => {
    const fetchCases = async () => {
      try {
        const res = await fetch("/api/viva-cases");
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
  }, []);

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

  function openCase(viva: VivaCaseRecord) {
    const selectedMode = getSelectedMode(viva);
    router.push(`/ai-viva/session/${viva.id}?mode=${selectedMode}`);
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
      <main className="urologics-shell flex min-h-screen items-center justify-center bg-[#03101d]">
        <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(145deg,rgba(9,20,38,0.98),rgba(15,35,59,0.92))] px-8 py-6 text-slate-100 shadow-[0_24px_60px_rgba(2,6,23,0.4)]">
          Loading Urologics AI Viva cases...
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="urologics-shell flex min-h-screen items-center justify-center bg-[#03101d]">
        <div className="rounded-[28px] border border-rose-300/20 bg-[linear-gradient(145deg,rgba(48,18,32,0.96),rgba(15,35,59,0.92))] px-8 py-6 text-rose-100 shadow-[0_24px_60px_rgba(2,6,23,0.4)]">
          {error}
        </div>
      </main>
    );
  }

  return (
    <main className="urologics-shell relative overflow-hidden bg-[#03101d]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(45,212,191,0.14),transparent_22%),radial-gradient(circle_at_85%_15%,rgba(168,85,247,0.14),transparent_20%),radial-gradient(circle_at_75%_100%,rgba(59,130,246,0.14),transparent_28%)]" />

      <div className="relative mx-auto max-w-7xl px-5 py-5 md:px-6">
        <header className="urologics-header flex flex-wrap items-center justify-between gap-4 px-5 py-4 md:px-6">
          <UrologicsBrand product="AI Viva" tag="Case library" />
          <UrologicsNav current="AI Viva" />
        </header>

        <section className="grid gap-7 py-8 lg:grid-cols-[1.08fr_0.92fr] lg:py-12">
          <div className="rounded-[34px] border border-white/10 bg-[linear-gradient(145deg,rgba(7,26,34,0.98),rgba(15,35,59,0.92))] p-7 shadow-[0_28px_74px_rgba(2,6,23,0.42)] md:p-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-teal-300/20 bg-teal-400/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.26em] text-teal-100">
              <Sparkles size={14} />
              AI Viva
            </div>
            <h1 className="mt-7 text-4xl font-extrabold tracking-[-0.04em] text-white md:text-6xl">
              Choose a viva case.
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-8 text-slate-200 md:text-lg">
              Select a case and start in calm or fast mode.
            </p>
          </div>

          <div className="rounded-[34px] border border-white/10 bg-[linear-gradient(145deg,rgba(26,18,49,0.92),rgba(8,17,31,0.94))] p-7 shadow-[0_24px_60px_rgba(2,6,23,0.36)] md:p-8">
            <div className="flex items-center gap-3 text-fuchsia-200">
              <Sparkles size={18} />
              <span className="text-[11px] font-semibold uppercase tracking-[0.26em]">Filters</span>
            </div>
            <div className="mt-6 grid gap-4">
              <div>
                <label className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-200">
                  <Search size={14} />
                  Search
                </label>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by title, level, or objective"
                  className="w-full rounded-2xl border border-white/10 bg-[#071321] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-teal-300/40 focus:ring-2 focus:ring-teal-300/10"
                />
              </div>
              <div>
                <label className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-200">
                  <Filter size={14} />
                  Level
                </label>
                <select
                  value={levelFilter}
                  onChange={(e) => setLevelFilter(e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-[#071321] px-4 py-3 text-sm text-white outline-none transition focus:border-teal-300/40 focus:ring-2 focus:ring-teal-300/10"
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
          <div className="rounded-[30px] border border-white/10 bg-[linear-gradient(145deg,rgba(7,26,34,0.98),rgba(15,35,59,0.92))] p-10 text-center shadow-[0_24px_60px_rgba(2,6,23,0.34)]">
            <div className="text-xl font-bold text-white">No cases found</div>
            <p className="mt-3 text-sm leading-7 text-slate-200">Try a wider filter or a simpler search term.</p>
          </div>
        ) : (
          <section className="grid gap-6 pb-16 md:grid-cols-2 xl:grid-cols-3">
            {filteredCases.map((viva, index) => (
              <article
                key={viva.id}
                className={`flex cursor-pointer flex-col justify-between rounded-[30px] border p-6 shadow-[0_24px_60px_rgba(2,6,23,0.34)] transition hover:-translate-y-1 ${
                  getSelectedMode(viva) === "fast"
                    ? "border-rose-400/35 shadow-[0_24px_60px_rgba(127,29,29,0.28)]"
                    : "border-white/10 hover:border-teal-300/25"
                } ${
                  index % 3 === 0
                    ? "bg-[linear-gradient(145deg,rgba(7,26,34,0.98),rgba(15,35,59,0.92))]"
                    : index % 3 === 1
                      ? "bg-[linear-gradient(145deg,rgba(16,24,52,0.96),rgba(8,17,31,0.94))]"
                      : "bg-[linear-gradient(145deg,rgba(31,19,49,0.96),rgba(8,17,31,0.94))]"
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
                    <span className="inline-flex items-center rounded-full border border-teal-300/20 bg-teal-400/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-teal-100">
                      {viva.case.level}
                    </span>
                    <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-200">
                      Urologics Case
                    </span>
                  </div>

                  <h2 className="mt-6 text-2xl font-bold text-white">{viva.case.title}</h2>
                  <p className="mt-3 line-clamp-4 text-sm leading-7 text-slate-200">{viva.case.stem}</p>

                  <div
                    className={`mt-6 rounded-[22px] border p-4 ${
                      getSelectedMode(viva) === "fast"
                        ? "border-rose-400/30 bg-[linear-gradient(145deg,rgba(127,29,29,0.28),rgba(69,10,10,0.18))]"
                        : "border-white/10 bg-white/[0.07]"
                    }`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <div className="text-sm font-bold text-white">
                          {getSelectedMode(viva) === "fast" ? "Fast and Furious" : "Calm and Composed"}
                        </div>
                        <div className="mt-1 text-xs leading-5 text-slate-200">
                          Choose your pace.
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-slate-200">Calm</span>
                        <Switch
                          checked={getSelectedMode(viva) === "fast"}
                          onCheckedChange={(checked) => handleModeChange(viva, checked)}
                          disabled={!viva.modes?.fastAndFurious?.enabled}
                        />
                        <span className="text-xs font-medium text-slate-200">Fast</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 space-y-2.5">
                    {viva.case.objectives.slice(0, 3).map((objective, objectiveIndex) => (
                      <div key={objectiveIndex} className="flex gap-3 text-sm text-slate-100">
                        <span className="mt-2 h-1.5 w-1.5 rounded-full bg-teal-200" />
                        <span className="leading-6">{objective}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-teal-100"
                  onClick={(e) => {
                    localStorage.removeItem("candidateInfo");
                    e.stopPropagation();
                    openCase(viva);
                  }}
                >
                  Start Urologics AI Viva
                  <ArrowRight size={16} />
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
