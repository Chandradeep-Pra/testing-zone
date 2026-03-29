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

import toast from "react-hot-toast";
import { vivaContext } from "@/ai-viva-data/vivaContext"; // use for case title

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
  const [candidate, setCandidate] = useState({ name: "", email: "", conversation: [], report: null });

  useEffect(() => {
    const stored = localStorage.getItem("candidateInfo");
    if (stored) {
      setCandidate(JSON.parse(stored));
    }
  }, []);

  // load evaluation from sessionStorage and convert to report structure

useEffect(() => {
  const raw = sessionStorage.getItem("viva-final-score");

  if (!raw) return;

  async function processAndSend() {
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

      const finalReport = {
        caseTitle: vivaContext.case.title,
        overallScore: overall,
        strengthsOverall: evalObj.strengthsOverall || [],
        weaknessesOverall: evalObj.weaknessesOverall || [],
        improvementPlan: evalObj.improvementPlan || [],
        domains,
      };

      setReport(finalReport);

      /* -----------------------------
         Save to localStorage
      ----------------------------- */
      const stored = localStorage.getItem("candidateInfo");

      if (!stored) {
        toast.error("Candidate info missing");
        return;
      }

      const parsed = JSON.parse(stored);
      parsed.report = finalReport;

      localStorage.setItem("candidateInfo", JSON.stringify(parsed));

      /* -----------------------------
         🚀 CALL API HERE
      ----------------------------- */

      toast.custom(
  (t) => (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
        t.visible ? "animate-in fade-in slide-in-from-top-2" : "animate-out fade-out"
      }`}
      style={{
        background: "linear-gradient(135deg, #1e293b, #0f172a)",
        border: "1px solid rgba(148,163,184,0.2)",
        boxShadow: "0 10px 30px rgba(0,0,0,0.4)",
      }}
    >
      <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />

      <div>
        <p className="text-sm font-medium text-white">Sending your report</p>
        <p className="text-xs text-slate-400">Preparing PDF & emailing…</p>
      </div>
    </div>
  ),
  { id: "send-mail" }
);

      const res = await fetch("/api/send-report", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          candidateInfo: parsed,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to send email");
      }

      toast.custom(
  (t) => (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-xl ${
        t.visible ? "animate-in fade-in slide-in-from-top-2" : "animate-out fade-out"
      }`}
      style={{
        background: "linear-gradient(135deg, #065f46, #022c22)",
        border: "1px solid rgba(34,197,94,0.3)",
      }}
    >
      <CheckCircle2 className="text-emerald-400" size={20} />

      <div>
        <p className="text-sm font-semibold text-white">Report Sent</p>
        <p className="text-xs text-emerald-300">Check your inbox 📩</p>
      </div>
    </div>
  ),
  { id: "send-mail" }
);

    } catch (err) {
      console.error("Error:", err);

      toast.error("Failed to send report ❌", {
        id: "send-mail",
      });
    }
  }

  processAndSend();
}, []);

  if (!report) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <p className="text-slate-400">Loading score…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 px-4 py-6 md:px-6 md:py-10">
      <div className="w-full max-w-5xl mx-auto space-y-8 md:space-y-10">

        {/* HEADER */}
        <section className="border-b border-slate-800 pb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
            <div className="flex items-start gap-3">
              <Trophy className="text-emerald-400 flex-shrink-0" size={20} />
              <div>
                <h1 className="text-lg md:text-xl font-semibold">
                  Performance Report
                </h1>
                <p className="text-slate-400 text-xs md:text-sm line-clamp-2">
                  {report.caseTitle}
                </p>
              </div>
            </div>

            <div className="text-right flex-shrink-0">
              <div className="text-3xl md:text-4xl font-semibold text-emerald-400">
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
          <section className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">

            {report.strengthsOverall.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0" />
                  <h2 className="text-xs md:text-sm font-medium text-emerald-400">
                    Strengths
                  </h2>
                </div>

                <div className="space-y-2">
                  {report.strengthsOverall.map((item, i) => (
                    <div
                      key={i}
                      className="bg-emerald-500/10 border border-emerald-500/20 p-2 md:p-3 rounded-lg text-xs md:text-sm"
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
                  <AlertTriangle size={16} className="text-red-400 flex-shrink-0" />
                  <h2 className="text-xs md:text-sm font-medium text-red-400">
                    Weaknesses
                  </h2>
                </div>

                <div className="space-y-2">
                  {report.weaknessesOverall.map((item, i) => (
                    <div
                      key={i}
                      className="bg-red-500/10 border border-red-500/20 p-2 md:p-3 rounded-lg text-xs md:text-sm"
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
        <section className="space-y-4 md:space-y-6 border-t border-slate-800 pt-6">

          <div className="flex items-center gap-2">
            <Activity size={16} className="text-slate-400 flex-shrink-0" />
            <h2 className="text-xs md:text-sm font-medium text-slate-400 uppercase tracking-wide">
              Domain Performance
            </h2>
          </div>

          {report.domains.map((domain, index) => {
            const isOpen = expanded === index;

            return (
              <div
                key={index}
                className="border border-slate-800 rounded-lg p-3 md:p-4 space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 sm:gap-6">

                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-slate-200 text-sm md:text-base">
                      {domain.name}
                    </div>

                    <p className="text-xs md:text-sm text-slate-400 mt-1 line-clamp-2">
                      {domain.summary}
                    </p>
                  </div>

                  <div className="text-2xl md:text-2xl font-semibold text-slate-300 flex-shrink-0">
                    {domain.score}
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  className="px-0 text-xs md:text-sm text-slate-400 hover:text-slate-200 w-full md:w-auto justify-start md:justify-start"
                  onClick={() =>
                    setExpanded(isOpen ? null : index)
                  }
                >
                  {isOpen ? (
                    <>
                      Hide detailed feedback <ChevronUp size={14} className="ml-1" />
                    </>
                  ) : (
                    <>
                      View detailed feedback <ChevronDown size={14} className="ml-1" />
                    </>
                  )}
                </Button>

                {isOpen && (
                  <div className="text-xs md:text-sm text-slate-300 leading-relaxed bg-slate-900/60 p-3 md:p-4 rounded-md border border-slate-800">
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

            <h2 className="text-xs md:text-sm font-medium text-slate-400 uppercase tracking-wide">
              Next Focus Areas
            </h2>

            <div className="flex flex-wrap gap-2 md:gap-3">
              {report.improvementPlan.map((item, i) => (
                <Badge
                  key={i}
                  variant="secondary"
                  className="bg-slate-800 text-slate-200 px-2 md:px-3 py-1 text-xs md:text-sm"
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