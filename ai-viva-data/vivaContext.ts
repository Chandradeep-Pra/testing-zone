export const vivaContext = {
  case: {
    id: "case-hematuria-001",
    title: "Painless Hematuria Evaluation",
    level: "Intermediate",
    stem: "A 47-year-old male presents with a 3-week history of painless visible hematuria, without associated dysuria, fever, flank pain, or recent trauma. There is no history of anticoagulant use. He is haemodynamically stable at presentation.",
    objectives: [
      "Formulate a differential diagnosis for painless hematuria",
      "Select and prioritise appropriate investigations",
      "Interpret imaging and report findings",
      "Demonstrate safe clinical judgement and escalation"
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
        "Urine cytology reveals atypical urothelial cells."
    }
  ],

  viva_rules: {
    max_duration_minutes: 40,
    max_questions: 10,
    question_style: "single_question_only",
    allow_candidate_request: true
  }
};
