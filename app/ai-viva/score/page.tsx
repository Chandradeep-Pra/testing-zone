"use client";

import React, { useEffect, useState } from "react";

type Evaluation = {
  basic_knowledge: { score: number; reason: string };
  higher_order_processing: { score: number; reason: string };
  clinical_skills: { score: number; reason: string };
  professionalism: { score: number; reason: string };
};

export default function ReviewPage() {
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem("viva-final-score");
    if (raw) {
      setEvaluation(JSON.parse(raw));
    }
  }, []);

  if (!evaluation) {
    return (
      <div className="h-screen bg-black text-neutral-400 flex items-center justify-center">
        <p className="text-sm">No evaluation data found.</p>
      </div>
    );
  }

  const entries = Object.entries(evaluation);

  const overallScore = Math.round(
    entries.reduce((sum, [, d]) => sum + d.score, 0) / entries.length
  );

  return (
    <div className="h-screen bg-black text-neutral-200 p-6">
      <div className="grid grid-cols-12 grid-rows-6 gap-4 h-full max-w-7xl mx-auto">

        {/* OVERALL SCORE */}
        <div className="col-span-12 row-span-1 bg-neutral-950 border border-emerald-500 rounded-xl p-6 flex justify-between items-center">
          <div>
            <p className="text-xs tracking-widest text-neutral-400 mb-1">
              OVERALL PERFORMANCE
            </p>
            <p className="text-3xl font-semibold text-emerald-400">
              {overallScore} / 8
            </p>
          </div>
          <div className="text-right text-sm text-neutral-400">
            {entries.length} domains assessed
          </div>
        </div>

        {/* DOMAIN CARDS */}
        {entries.map(([key, domain]) => (
          <div
            key={key}
            className="col-span-6 row-span-2 bg-neutral-950 border-l-4 border-emerald-500 rounded-xl p-5 flex flex-col"
          >
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-lg font-semibold capitalize">
                {key.replace(/_/g, " ")}
              </h2>
              <span className="text-emerald-400 font-medium">
                {domain.score} / 8
              </span>
            </div>

            <p className="text-sm text-neutral-300 leading-relaxed">
              {domain.reason}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
