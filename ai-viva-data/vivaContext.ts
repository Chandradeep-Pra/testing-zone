

export const vivaContext = {
 case: {
    id: "case-hematuria-001",
    title: "Painless Hematuria Evaluation",
    level: "Intermediate",
    stem: "A 66 year gentleman referred to one stop Hematuria clinic for intermittent VH for last 1 month.",
    objectives: [
      "Formulate evaluation plan for painless hematuria",
      "Select and prioritise appropriate investigations",
      "Interpret imaging and report findings",
      "Demonstrate safe clinical management as per guidelines"
    ],
  },
 
  exhibits: [
    {
      id: "img-ct-001",
      kind: "image",
      label: "CT Urography",
      file: "img-ct-001.png", // File reference unchanged
      // 'description' is now the 'Ground Truth' for the AI to grade against
      description: "CT urography (delayed phase) demonstrates a 2cm filling defect arising from the left posterolateral bladder wall. No evidence of hydroureter or upper tract urothelial tumor (UTUC)."
    },
    {
      id: "rep-urine-001",
      kind: "image",
      label: "Cystoscopy Finding",
      file: "rep-urine-001.jpeg", // File reference unchanged
      description: "Flexible cystoscopy reveals a solitary, pedunculated papillary lesion (approx. 2cm) near the left ureteric orifice. Bladder mucosa otherwise appears healthy."
    }
  ],

 

  marking_criteria: {
    must_mention: ["Fowler’s syndrome", "Large capacity hypo contractile bladder"],
    critical_fail: ["Missed diagnosis of Fowler’s syndrome"],
  },

  viva_rules: {
    max_duration_minutes: 10,
    max_questions: 10,
    question_style: "single_question_only",
    allow_candidate_request: true,
    examiner_tone: "Formal, neutral, and concise (UK Consultant Style)",
    progression: "Laddered (Basics -> Interpretation -> Management -> Complications)"
  }
};