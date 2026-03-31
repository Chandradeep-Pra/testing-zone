"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface VivaCase {
  id: string;
  case: {
    title: string;
    level: string;
    stem: string;
    objectives: string[];
  };
  exhibits: {
    label: string;
    url: string;
    description: string;
  }[];
  marking_criteria: {
    must_mention: string[];
    critical_fail: string[];
  };
  attemptsCount?: number;
}

const VivaCasesPage: React.FC = () => {
  const [cases, setCases] = useState<VivaCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState<string>("all");
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
    fetchCases();
  }, []);

  // Get unique levels for filter dropdown
  const levels = Array.from(new Set(cases.map((c) => c.case.level)));

  // Filtered and searched cases
  const filteredCases = cases.filter((viva) => {
    const matchesLevel = levelFilter === "all" || viva.case.level === levelFilter;
    const searchLower = search.toLowerCase();
    const matchesSearch =
      viva.case.title.toLowerCase().includes(searchLower) ||
      viva.case.level.toLowerCase().includes(searchLower) ||
      viva.case.objectives.some((obj) => obj.toLowerCase().includes(searchLower));
    return matchesLevel && matchesSearch;
  });

  if (loading)
    return (
          <div className="flex min-h-screen items-center justify-center bg-slate-950">
            <span className="text-lg text-slate-400">Loading cases...</span>
          </div>
        );
      if (error)
        return (
          <div className="flex min-h-screen items-center justify-center bg-slate-950">
            <span className="text-lg text-red-400">{error}</span>
          </div>
        );

      return (
        <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center p-6">
          <div className="w-full max-w-6xl ">
            <h1 className="text-4xl font-bold mb-8 text-center tracking-tight">Viva Cases</h1>
            <div className="flex flex-col md:flex-row md:items-center md:justify-start gap-4 mb-8">
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by title, level, or objective..."
                className="w-full md:w-1/2 px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
                aria-label="Search cases"
              />
              <select
                value={levelFilter}
                onChange={e => setLevelFilter(e.target.value)}
                className="w-full md:w-48 px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
                aria-label="Filter by level"
              >
                <option value="all">All Levels</option>
                {levels.map((level) => (
                  <option key={level} value={level}>{level}</option>
                ))}
              </select>
            </div>
            {filteredCases.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24">
                <span className="text-xl text-slate-400 mb-2">No cases found.</span>
                <span className="text-sm text-slate-500">Try adjusting your search or filters.</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredCases.map((viva) => (
                  <Card
                    key={viva.id}
                    className="bg-slate-900 border-slate-800 shadow-xl rounded-2xl flex flex-col justify-between hover:scale-[1.02] hover:shadow-2xl transition-transform cursor-pointer group"
                    onClick={() => router.push(`/ai-viva/session/${viva.id}`)}
                    tabIndex={0}
                    aria-label={`Open viva case: ${viva.case.title}`}
                    onKeyDown={e => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        router.push(`/ai-viva/session/${viva.id}`);
                      }
                    }}
                  >
                    <CardHeader className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-wide text-xs font-semibold px-3 py-1">
                          {viva.case.level}
                        </Badge>
                        {/* {typeof viva.attemptsCount === "number" && (
                          <Badge className="bg-slate-800 text-slate-300 border border-slate-700 px-3 py-1">
                            Attempts: {viva.attemptsCount}
                          </Badge>
                        )} */}
                      </div>
                      <CardTitle className="text-2xl font-semibold text-slate-100 group-hover:text-emerald-400 transition-colors">
                        {viva.case.title}
                      </CardTitle>
                      <CardDescription className="line-clamp-2 text-base text-slate-400 mt-1">
                        {viva.case.stem}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <h3 className="text-sm font-semibold text-slate-200 mb-2">Objectives</h3>
                        <ul className="space-y-2 text-sm text-slate-400">
                          {viva.case.objectives.map((obj, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-400" />
                              {obj}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Button
                        className="w-full gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-base font-semibold py-2 rounded-xl"
                        onClick={e => {
                          e.stopPropagation();
                          router.push(`/ai-viva/session/${viva.id}`);
                        }}
                      >
                        Start Viva
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </main>
      );
}

export default VivaCasesPage;
