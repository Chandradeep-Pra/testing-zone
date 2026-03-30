//@ts-nocheck

"use client";

import React, { useState, useEffect } from "react";
// import html2pdf from "html2pdf.js";
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

  async function generatePdfBlob() {
  console.log("🟡 [PDF] Starting...");

  if (typeof window === "undefined") {
    throw new Error("Not in browser");
  }

  const html2pdf = (await import("html2pdf.js")).default;

  const original = document.getElementById("pdf-report");

  if (!original) {
    throw new Error("PDF element not found");
  }

  console.log("🟢 [PDF] Element found");

  // 🔥 Create isolated container (NOT document.body)
  const sandbox = document.createElement("div");

  sandbox.style.position = "fixed";
  sandbox.style.left = "0";
  sandbox.style.top = "0";
  sandbox.style.width = "800px";
  sandbox.style.background = "#ffffff";
  sandbox.style.color = "#000000";
  sandbox.style.zIndex = "-9999";

  // 🔥 Clone
  const clone = original.cloneNode(true) as HTMLElement;

  // 🔥 FORCE CLEAN STYLES
  const all = [clone, ...clone.querySelectorAll("*")];

  all.forEach((el: any) => {
    el.style.all = "unset"; // 💥 nuclear reset
    el.style.boxSizing = "border-box";
    el.style.fontFamily = "Arial, sans-serif";
    el.style.color = "#000";
    el.style.background = "transparent";
  });

  clone.style.padding = "40px";
  clone.style.width = "800px";
  clone.style.background = "#fff";

  sandbox.appendChild(clone);
  document.body.appendChild(sandbox);

  console.log("🟡 [PDF] Sandbox ready");

  const pdfBlob = await html2pdf()
    .from(clone)
    .set({
      margin: 10,
      html2canvas: {
        scale: 2,
        backgroundColor: "#ffffff",
        logging: true,
      },
      jsPDF: {
        unit: "mm",
        format: "a4",
      },
    })
    .outputPdf("blob");

  document.body.removeChild(sandbox);

  console.log("🟢 [PDF] Generated");

  return pdfBlob;
}

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

 console.log("🟡 [FLOW] Waiting for DOM...");

// 🔥 Fix: wait for DOM render
await new Promise((r) => setTimeout(r, 500));

console.log("🟡 [FLOW] Generating PDF...");

let pdfBlob;

try {
  pdfBlob = await generatePdfBlob();
} catch (e) {
  console.error("❌ [FLOW] PDF FAILED:", e);
  throw e;
}

console.log("🟢 [FLOW] PDF Ready");

const formData = new FormData();
formData.append("file", pdfBlob, "report.pdf");
formData.append("email", parsed.email);
formData.append("name", parsed.name);

console.log("🟡 [FLOW] Calling API...");

let res;

try {
  res = await fetch("/api/send-report", {
    method: "POST",
    body: formData,
  });
} catch (e) {
  console.error("❌ [FLOW] FETCH FAILED:", e);
  throw e;
}

console.log("🟢 [FLOW] API Response:", res.status);

if (!res.ok) {
  const text = await res.text();
  console.error("❌ [FLOW] API ERROR:", text);
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

      <div
  style={{
    position: "absolute",
    left: "-9999px",
    top: 0,
  }}
>
  <div
    id="pdf-report"
    style={{
      backgroundColor: "#ffffff",
      color: "#000000",
      padding: "40px",
      width: "800px",
      fontFamily: "Arial, sans-serif",
      lineHeight: "1.5",
    }}
  >

    {/* TITLE */}
    <h1
      style={{
        fontSize: "24px",
        fontWeight: "700",
        marginBottom: "20px",
        textAlign: "center",
      }}
    >
      Viva Examination Report
    </h1>

    {/* BASIC INFO */}
    <p style={{ marginBottom: "6px" }}>
      <strong>Candidate:</strong> {candidate.name}
    </p>

    <p style={{ marginBottom: "16px" }}>
      <strong>Score:</strong> {report.overallScore}/10
    </p>

    {/* Q&A */}
    <h2
      style={{
        fontSize: "18px",
        fontWeight: "600",
        marginTop: "24px",
        marginBottom: "10px",
        borderBottom: "1px solid #ccc",
        paddingBottom: "4px",
      }}
    >
      Q&A
    </h2>

    {candidate.conversation?.map((m: any, i: number) => (
      <div
        key={i}
        style={{
          marginBottom: "8px",
          fontSize: "14px",
        }}
      >
        <strong>{m.role === "ai" ? "Q:" : "A:"}</strong>{" "}
        {m.text || "No response"}
      </div>
    ))}

    {/* EVALUATION */}
    <h2
      style={{
        fontSize: "18px",
        fontWeight: "600",
        marginTop: "24px",
        marginBottom: "10px",
        borderBottom: "1px solid #ccc",
        paddingBottom: "4px",
      }}
    >
      Detailed Evaluation
    </h2>

    {report.domains.map((d, i) => (
      <div
        key={i}
        style={{
          marginBottom: "14px",
        }}
      >
        <div
          style={{
            fontWeight: "600",
            marginBottom: "4px",
          }}
        >
          {d.name} ({d.score}/10)
        </div>

        <div
          style={{
            fontSize: "14px",
            color: "#333",
          }}
        >
          {d.summary}
        </div>
      </div>
    ))}

  </div>
</div>
    </main>
  );
}