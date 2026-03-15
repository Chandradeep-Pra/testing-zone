// export const vivaContext = {
//   case: {
//     id: "case-hematuria-001",
//     title: "Painless Hematuria Evaluation",
//     level: "Intermediate",
//     stem: "A 56 year gentleman referred to one stop Hematuria clinic for intermittent VH for last 1 month.",
//     objectives: [
//       "Formulate evaluation plan for painless hematuria",
//       "Select and prioritise appropriate investigations",
//       "Interpret imaging and report findings",
//       "Demonstrate safe clinical management as per guidelines"
//     ]
//   },

// export const vivaContext = {
//  case: {
//     id: "case-hematuria-001",
//     title: "Painless Hematuria Evaluation",
//     level: "Intermediate",
//     stem: "A 56 year gentleman referred to one stop Hematuria clinic for intermittent VH for last 1 month.",
//     objectives: [
//       "Formulate evaluation plan for painless hematuria",
//       "Select and prioritise appropriate investigations",
//       "Interpret imaging and report findings",
//       "Demonstrate safe clinical management as per guidelines"
//     ],
  // },
  export const vivaContext = {
 case: {
    id: "case-luts-001",
    title: "Voiding LUTS Evaluation",
    level: "Intermediate",
    stem: "A 22 year lady presented with voiding LUTS for 5-6 years with histry of PCOS",
    objectives: [
      `Formulate evaluation plan for voiding LUTS`,
      "Select and prioritise appropriate investigations",
      "Interpret imaging and report findings",
      "Demonstrate safe clinical management as per guidelines"
    ]
  },
  // exhibits: [
  //   {
  //     id: "img-ct-001",
  //     kind: "image",
  //     label: "CT Urography",
  //     file: "img-ct-001.png", // File reference unchanged
  //     // 'description' is now the 'Ground Truth' for the AI to grade against
  //     description: "CT urography (delayed phase) demonstrates a 2cm filling defect arising from the left posterolateral bladder wall. No evidence of hydroureter or upper tract urothelial tumor (UTUC)."
  //   },
  //   {
  //     id: "rep-urine-001",
  //     kind: "image",
  //     label: "Cystoscopy Finding",
  //     file: "rep-urine-001.jpeg", // File reference unchanged
  //     description: "Flexible cystoscopy reveals a solitary, pedunculated papillary lesion (approx. 2cm) near the left ureteric orifice. Bladder mucosa otherwise appears healthy."
  //   }
  // ],

   exhibits: [
    {
      id: "LUTS-01",
      kind: "image",
      label: "Video Urodynamic study",
      file: "LUTS-01.jpeg", // File reference unchanged
      // 'description' is now the 'Ground Truth' for the AI to grade against
      description: "Urodynamic finding graph"
    },
    {
      id: "LUTS-02",
      kind: "image",
      label: "Cystoscopy Finding",
      file: "LUTS-02.jpeg", // File reference unchanged
      description: "The urodynamic finding suggest large capacity hypo contractile bladder suggestive of Fowler’s syndrome"
    }
  ],

  // New section to ensure the AI evaluates correctly
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