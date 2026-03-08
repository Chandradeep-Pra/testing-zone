"use client";

import React, { useState, useEffect } from "react";
import {
  Trophy,
  CheckCircle2,
  AlertTriangle,
  Activity,
  ChevronDown,
  ChevronUp
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { vivaContext } from "@/ai-viva-data/vivaContext"; // use for case title

// evaluation object persisted by VivaVoiceAi.endViva

interface EvalDimension {
  score: number;
  reason: string;
}

type EvaluationResponse = {
  basic_knowledge: EvalDimension;
  higher_order_processing: EvalDimension;
  clinical_skills: EvalDimension;
  professionalism: EvalDimension;
  [key: string]: EvalDimension;
};

interface DomainReport {
  name: string;
  score: number;
  summary: string;
  reasoning: string;
}

interface Report {
  caseTitle: string;
  overallScore: number;
  strengthsOverall: string[];
  weaknessesOverall: string[];
  domains: DomainReport[];
  improvementPlan: string[];
}

export default function ReviewPage() {
  const [expanded, setExpanded] = useState<number | null>(null);
  const [report, setReport] = useState<Report | null>(null);

  // load evaluation from sessionStorage and convert to report structure
  useEffect(() => {
  const raw = sessionStorage.getItem("viva-final-score");

  if (!raw) return;

  try {
    const evalObj = JSON.parse(raw);

    const domainKeys = [
      "basic_knowledge",
      "higher_order_processing",
      "clinical_skills",
      "professionalism",
    ];

    const domains: DomainReport[] = domainKeys.map((key) => {
      const val = evalObj[key];

      return {
        name: key
          .replace(/_/g, " ")
          .replace(/\b\w/g, (c) => c.toUpperCase()),

        score: Number(val?.score) || 0,

        summary: val?.summary || "",

        reasoning: val?.reason || "",
      };
    });

    const overall = Math.round(
      domains.reduce((sum, d) => sum + d.score, 0) / domains.length
    );

    setReport({
      caseTitle: vivaContext.case.title,

      overallScore: overall,

      strengthsOverall: evalObj.strengthsOverall || [],

      weaknessesOverall: evalObj.weaknessesOverall || [],

      improvementPlan: evalObj.improvementPlan || [],

      domains,
    });

  } catch (e) {
    console.error("failed to parse evaluation", e);
  }
}, []);

  if (!report) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <p className="text-slate-400">Loading score…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 px-6 py-10">
      <div className="max-w-5xl mx-auto space-y-10">

        {/* HEADER */}
        <section className="border-b border-slate-800 pb-6">
          <div className="flex items-end justify-between">
            <div className="flex items-center gap-3">
              <Trophy className="text-emerald-400" size={22} />
              <div>
                <h1 className="text-xl font-semibold">
                  Performance Report
                </h1>
                <p className="text-slate-400 text-sm">
                  {report.caseTitle}
                </p>
              </div>
            </div>

            <div className="text-right">
              <div className="text-4xl font-semibold text-emerald-400">
                {report.overallScore} 
              </div>
              <div className="text-xs text-slate-500">
                Overall / 8
              </div>
            </div>
          </div>
        </section>

        {/* STRENGTHS & WEAKNESSES */}
        {(report.strengthsOverall.length > 0 || report.weaknessesOverall.length > 0) && (
          <section className="grid md:grid-cols-2 gap-8">

            {report.strengthsOverall.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 size={18} className="text-emerald-400" />
                  <h2 className="text-sm font-medium text-emerald-400">
                    Strengths
                  </h2>
                </div>

                <div className="space-y-2">
                  {report.strengthsOverall.map((item, i) => (
                    <div
                      key={i}
                      className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-lg text-sm"
                    >
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {report.weaknessesOverall.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle size={18} className="text-red-400" />
                  <h2 className="text-sm font-medium text-red-400">
                    Weaknesses
                  </h2>
                </div>

                <div className="space-y-2">
                  {report.weaknessesOverall.map((item, i) => (
                    <div
                      key={i}
                      className="bg-red-500/10 border border-red-500/20 p-3 rounded-lg text-sm"
                    >
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            )}

          </section>
        )}

        {/* DOMAIN PERFORMANCE */}
        <section className="space-y-6 border-t border-slate-800 pt-6">

          <div className="flex items-center gap-2">
            <Activity size={18} className="text-slate-400" />
            <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wide">
              Domain Performance
            </h2>
          </div>

          {report.domains.map((domain, index) => {
            const isOpen = expanded === index;

            return (
              <div
                key={index}
                className="border border-slate-800 rounded-lg p-4 space-y-3"
              >
                <div className="flex justify-between items-start gap-6">

                  <div className="flex-1">
                    <div className="font-medium text-slate-200">
                      {domain.name}
                    </div>

                    <p className="text-sm text-slate-400 mt-1">
                      {domain.summary}
                    </p>
                  </div>

                  <div className="text-2xl font-semibold text-slate-300">
                    {domain.score}
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  className="px-0 text-slate-400 hover:text-slate-200"
                  onClick={() =>
                    setExpanded(isOpen ? null : index)
                  }
                >
                  {isOpen ? (
                    <>
                      Hide detailed feedback <ChevronUp size={16} />
                    </>
                  ) : (
                    <>
                      View detailed feedback <ChevronDown size={16} />
                    </>
                  )}
                </Button>

                {isOpen && (
                  <div className="text-sm text-slate-300 leading-relaxed bg-slate-900/60 p-4 rounded-md border border-slate-800">
                    {domain.reasoning}
                  </div>
                )}

              </div>
            );
          })}

        </section>

        {/* NEXT FOCUS AREA */}
        {report.improvementPlan.length > 0 && (
          <section className="space-y-4 border-t border-slate-800 pt-6">

            <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wide">
              Next Focus Areas
            </h2>

            <div className="flex flex-wrap gap-3">
              {report.improvementPlan.map((item, i) => (
                <Badge
                  key={i}
                  variant="secondary"
                  className="bg-slate-800 text-slate-200 px-3 py-1 text-sm"
                >
                  {item}
                </Badge>
              ))}
            </div>

          </section>
        )}

      </div>
    </main>
  );
}