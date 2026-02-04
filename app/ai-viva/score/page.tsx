import React from "react";

const reviewData = {
  evaluation: {
    basic_knowledge: {
      score: 8,
      reason:
        "The candidate demonstrates an outstanding grasp of basic knowledge, providing accurate and comprehensive information throughout. This includes a thorough understanding of the diagnostic pathway for hematuria, specific findings on imaging and cystoscopy, the rationale for initial management (TURBT + MMC, citing Sylvester meta-analysis with precise recurrence reduction rates), and the nuanced management of pT1 high-grade NMIBC. They accurately quote upstaging rates for ReTURBT, correctly classify the disease as high-risk NMIBC per NICE guidelines, and precisely recall the benefits (recurrence and progression reduction) and regimen (LAMM) of BCG therapy. This level of detail and accuracy is excellent."
    },
    higher_order_processing: {
      score: 8,
      reason:
        "The candidate exhibits excellent higher-order processing skills. They are adept at synthesizing information from various sources (history, examination, CT, cystoscopy) to formulate a coherent diagnostic and management plan. Their response to pT1 high-grade disease demonstrates critical thinking by immediately considering MDT discussion, seeking further histological detail (CIS/deep muscle), and advocating for ReTURBT with a clear understanding of its implications. They effectively apply guideline-based knowledge to offer appropriate and nuanced treatment options (BCG vs. early radical cystectomy) for high-risk NMIBC, showcasing strong clinical reasoning and problem-solving abilities."
    },
    clinical_skills: {
      score: 8,
      reason:
        "The candidate consistently integrates crucial elements of clinical skills into their responses. They prioritize patient safety (chaperone, 'keeping it safe' during TURBT) and communication, repeatedly mentioning the need to 'counsel the patient' for procedures and major treatment decisions. Their explanation of BCG therapy is structured and comprehensive, covering benefits, practical aspects (LAMM regimen), and potential side effects, which directly reflects good patient communication. Furthermore, the immediate mention of MDT discussion highlights an understanding of collaborative care and the importance of multidisciplinary input for complex cases, all indicative of excellent clinical practice."
    },
    professionalism: {
      score: 8,
      reason:
        "The candidate demonstrates exemplary professionalism. Their communication is clear, confident, and concise throughout. They consistently exhibit a patient-centered approach by prioritizing patient dignity and safety (e.g., chaperone in examination) and emphasizing informed consent and shared decision-making (e.g., 'counsel the patient'). The proactive suggestion of MDT discussion for complex cases reflects a collaborative spirit, accountability, and an understanding of the ethical responsibilities in surgical practice. There is no evidence of arrogance or hesitation, reinforcing a highly professional demeanor."
    }
  }
};

export default function ReviewPage() {
  const entries = Object.entries(reviewData.evaluation);

  return (
    <div className="h-screen bg-black text-neutral-200 p-6">
      <div className="grid grid-cols-12 grid-rows-6 gap-4 h-full max-w-7xl mx-auto">

        {/* OVERALL */}
        <div className="col-span-12 row-span-1 bg-neutral-950 border border-emerald-500 rounded-xl p-6 flex justify-between items-center">
          <div>
            <p className="text-xs tracking-widest text-neutral-400 mb-1">
              OVERALL PERFORMANCE
            </p>
            <p className="text-3xl font-semibold text-emerald-400">
              8 / 8
            </p>
          </div>
          <div className="text-right text-sm text-neutral-400">
            {entries.length} domains assessed
          </div>
        </div>

        {/* DOMAIN CARDS */}
        {entries.map(([key, domain], index) => (
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

            <p className="text-sm text-neutral-300 leading-relaxed overflow-hidden">
              {domain.reason}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
