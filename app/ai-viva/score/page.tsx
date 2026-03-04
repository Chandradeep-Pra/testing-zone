"use client";

import React, { useState } from "react";
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

const report = {
  caseTitle: "LUTS Case Examination",
  overallScore: 6,
  strengthsOverall: [
    "Structured investigation approach",
    "Safe management decisions",
    "Clear communication"
  ],
  weaknessesOverall: [
    "Limited imaging justification depth",
    "Insufficient differential expansion",
    "Superficial risk explanation"
  ],
  domains: [
    {
      name: "Basic Knowledge",
      score: 7,
      summary:
        "Good prioritisation and foundational understanding.",
      reasoning:
        "You demonstrated solid understanding of investigation sequencing and malignancy risk factors. However, referencing guidelines explicitly would strengthen high-level justification."
    },
    {
      name: "Higher Order Processing",
      score: 5,
      summary:
        "Logical structure but lacked deeper analytical explanation.",
      reasoning:
        "While reasoning was coherent, analytical depth was limited when discussing imaging selection and risk stratification."
    },
    {
      name: "Clinical Skills",
      score: 6,
      summary:
        "Safe decisions overall but limited breadth in reasoning.",
      reasoning:
        "Clinical management was safe and appropriate, but differential diagnosis exploration lacked expansion under pressure."
    },
    {
      name: "Professionalism",
      score: 8,
      summary:
        "Clear, composed, and confident communication.",
      reasoning:
        "Communication was structured and confident throughout the session, demonstrating professional composure."
    }
  ],
  improvementPlan: [
    "Articulate imaging rationale clearly.",
    "Expand structured differential framework.",
    "Support decisions with guideline-level reasoning."
  ]
};

export default function ReviewPage() {
  const [expanded, setExpanded] = useState<number | null>(null);

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
        <section className="grid md:grid-cols-2 gap-8">

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

        </section>

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

      </div>
    </main>
  );
}