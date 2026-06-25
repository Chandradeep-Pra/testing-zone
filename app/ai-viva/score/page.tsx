"use client";

import React, { useEffect, useState } from "react";
import {
  Activity,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Target,
  Trophy,
  AlertTriangle,
} from "lucide-react";
import toast from "react-hot-toast";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import UrologicsBrand from "@/components/brand/UrologicsBrand";
import GlobalLoading from "@/components/ui/GlobalLoading";
import { appPath } from "@/lib/app-path";

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

function buildConversationFromQaHistory(history = []) {
  return history.flatMap((item: { question?: string; answer?: string }) => {
    const entries = [];

    if (item.question?.trim()) {
      entries.push({
        id: crypto.randomUUID(),
        role: "ai",
        text: item.question.trim(),
      });
    }

    if (item.answer?.trim()) {
      entries.push({
        id: crypto.randomUUID(),
        role: "candidate",
        text: item.answer.trim(),
      });
    }

    return entries;
  });
}

export default function ReviewPage() {
  const [expanded, setExpanded] = useState<number | null>(null);
  const [report, setReport] = useState<Report | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem("viva-final-score");
    if (!raw) return;
    const scorePayload = raw;

    async function processAndSend() {
      try {
        const evalObj = JSON.parse(scorePayload);
        const storedCandidate = localStorage.getItem("candidateInfo");
        const parsedCandidate = storedCandidate ? JSON.parse(storedCandidate) : null;

        const domains: DomainReport[] = [
          "basic_knowledge",
          "higher_order_processing",
          "clinical_skills",
          "professionalism",
        ].map((key) => {
          const val = evalObj[key];
          return {
            name: key.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()),
            score: Number(val?.score) || 0,
            summary: val?.summary || "",
            reasoning: val?.reason || "",
          };
        });

        const overall = Math.round(
          domains.reduce((sum, domain) => sum + domain.score, 0) / domains.length
        );

        const finalReport = {
          caseTitle:
            evalObj.caseTitle ||
            parsedCandidate?.selectedCaseTitle ||
            parsedCandidate?.selectedCase?.case?.title ||
            "Urologics AI Viva",
          overallScore: overall,
          strengthsOverall: evalObj.strengthsOverall || [],
          weaknessesOverall: evalObj.weaknessesOverall || [],
          improvementPlan: evalObj.improvementPlan || [],
          domains,
        };

        setReport(finalReport);

        if (!storedCandidate) {
          toast.error("Candidate info missing");
          return;
        }

        const parsed = JSON.parse(storedCandidate);
        const qaHistory = Array.isArray(parsed.qaHistory) ? parsed.qaHistory : [];
        parsed.report = finalReport;
        if (!Array.isArray(parsed.conversation) || parsed.conversation.length === 0) {
          parsed.conversation = buildConversationFromQaHistory(qaHistory);
        }
        localStorage.setItem("candidateInfo", JSON.stringify(parsed));

        toast.loading("Sending your Urologics AI Viva report...", { id: "send-mail" });

        const res = await fetch(appPath("/api/send-report"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ candidateInfo: parsed }),
        });

        if (!res.ok) {
          throw new Error("Failed to send email");
        }

        toast.success("Report sent successfully", { id: "send-mail" });
      } catch (err) {
        console.error("Error:", err);
        toast.error("Failed to send report", { id: "send-mail" });
      }
    }

    void processAndSend();
  }, []);

  if (!report) {
    return (
      <main className="urologics-shell flex min-h-screen items-center justify-center">
        <div className="urologics-panel px-8 py-8">
          <GlobalLoading label="Loading Urologics AI Viva score..." />
        </div>
      </main>
    );
  }

  return (
    <main className="urologics-shell px-3 py-3 sm:px-6 sm:py-6">
      <div className="mx-auto max-w-6xl space-y-4 sm:space-y-8">
        <header className="urologics-header flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:gap-4 sm:px-6 sm:py-5">
          <UrologicsBrand product="AI Viva" tag="Performance report" />
          <div className="urologics-chip">Scored Out Of 8</div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[1fr_0.42fr]">
          <div className="urologics-panel p-5 sm:p-8">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-50 text-[#0f7896]">
                <Trophy size={22} />
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.22em] text-[#0f7896]">
                  Urologics AI Viva Report
                </div>
                <h1 className="mt-3 max-w-3xl text-2xl font-semibold tracking-[-0.04em] text-[#071014] sm:text-3xl md:text-4xl">
                  {report.caseTitle}
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-[#071014]/65">
                  Domain scores, key feedback, and focused next steps.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center rounded-[28px] border border-[#0f7896]/12 bg-[#0f7896] p-6 text-center text-white shadow-[0_24px_60px_rgba(15,120,150,0.25)] sm:p-8">
            <div className="text-xs uppercase tracking-[0.22em] text-white/80">Overall Score</div>
            <div className="mt-3 text-5xl font-semibold text-white sm:mt-4 sm:text-6xl">{report.overallScore}</div>
            <div className="mt-2 text-sm text-white/75">out of 8</div>
          </div>
        </section>

        {(report.strengthsOverall.length > 0 || report.weaknessesOverall.length > 0) && (
          <section className="grid gap-6 md:grid-cols-2">
            <div className="urologics-panel p-5 sm:p-6">
              <div className="flex items-center gap-2 text-[#0f7896]">
                <CheckCircle2 size={16} />
                <h2 className="text-xs uppercase tracking-[0.24em]">Strengths</h2>
              </div>
              <div className="mt-5 space-y-3">
                {report.strengthsOverall.map((item, i) => (
                  <div key={i} className="urologics-subpanel p-4 text-sm leading-6 text-[#071014]/75">
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="urologics-panel p-5 sm:p-6">
              <div className="flex items-center gap-2 text-[#0f7896]">
                <AlertTriangle size={16} />
                <h2 className="text-xs uppercase tracking-[0.24em]">Weaknesses</h2>
              </div>
              <div className="mt-5 space-y-3">
                {report.weaknessesOverall.map((item, i) => (
                  <div key={i} className="urologics-subpanel p-4 text-sm leading-6 text-[#071014]/75">
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        <section className="urologics-panel p-5 sm:p-6">
          <div className="flex items-center gap-2 text-[#0f7896]">
            <Activity size={16} />
            <h2 className="text-xs uppercase tracking-[0.24em]">Domain Performance</h2>
          </div>
          <div className="mt-6 space-y-4">
            {report.domains.map((domain, index) => {
              const isOpen = expanded === index;

              return (
                <div key={index} className="urologics-subpanel p-4">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="max-w-3xl">
                      <div className="text-lg font-semibold text-[#071014]">{domain.name}</div>
                      <p className="mt-2 text-sm leading-6 text-[#071014]/65">{domain.summary}</p>
                    </div>
                    <div className="text-2xl font-semibold text-[#0f7896] sm:text-3xl">{domain.score}/8</div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-3 px-0 text-[#0f7896] hover:text-[#0b6078]"
                    onClick={() => setExpanded(isOpen ? null : index)}
                  >
                    {isOpen ? "Hide detailed review" : "View detailed review"}
                    {isOpen ? <ChevronUp size={14} className="ml-1" /> : <ChevronDown size={14} className="ml-1" />}
                  </Button>
                  {isOpen && (
                    <div className="mt-3 rounded-2xl border border-[#0f7896]/12 bg-cyan-50 p-4 text-sm leading-7 text-[#071014]/75">
                      {domain.reasoning}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {report.improvementPlan.length > 0 && (
          <section className="urologics-panel p-5 sm:p-6">
            <div className="flex items-center gap-2 text-[#0f7896]">
              <Target size={16} />
              <h2 className="text-xs uppercase tracking-[0.24em]">Next Focus Areas</h2>
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              {report.improvementPlan.map((item, i) => (
                <Badge key={i} className="rounded-full border border-[#0f7896]/12 bg-cyan-50 px-4 py-2 text-[#071014]">
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
