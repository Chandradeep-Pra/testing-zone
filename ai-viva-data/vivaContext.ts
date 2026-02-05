export const vivaContext = {
  case: {
    id: "case-hematuria-001",
    title: "Painless Hematuria Evaluation",
    level: "Intermediate",
    stem: "A 56 year gentleman referred to one stop Hematuria clinic for intermittent VH for last 1 month.",
    objectives: [
      "Formulate evaluation plan for painless hematuria",
      "Select and prioritise appropriate investigations",
      "Interpret imaging and report findings",
      "Demonstrate safe clinical management as per guidelines"
    ]
  },

  exhibits: [
    {
      id: "img-ct-001",
      kind: "image",
      label: "CT Urography",
      file: "img-ct-001.png",
      description:
        "CT urography demonstrates a filling defect arising from the bladder wall."
    },
    {
      id: "rep-urine-001",
      kind: "image",
      label: "Urine Cytology",
      file: "rep-urine-001.jpeg",
      description:
        "Flexible cystoscopy reveals papillary lesion in the bladder."
    }
  ],

  viva_rules: {
    max_duration_minutes: 10,
    max_questions: 10,
    question_style: "single_question_only",
    allow_candidate_request: true
  }
};
