export const vivaContext = {
  case: {
    id: "case-hematuria-001", // Keeping your original ID
    title: "FRCS Clinical: Visible Hematuria (VH) Assessment",
    level: "ST7-ST8 (Senior Registrar / FRCS Candidate)",
    // Professionalizing the 'stem' for a surgical viva
    stem: "A 56-year-old gentleman is referred to your One-Stop Hematuria clinic with a 1-month history of intermittent, painless visible hematuria. He is a smoker (25 pack-years) and has no significant comorbidities.",
    objectives: [
      "Systematic history taking and risk factor stratification (Smoking/Occupational)",
      "Selection of investigations aligned with BAUS/NICE guidelines (CTU/Cystoscopy)",
      "Radiological interpretation of upper and lower tract imaging",
      "Formulation of a definitive management plan (TURBT and intravesical therapy)"
    ]
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

  // New section to ensure the AI evaluates correctly
  marking_criteria: {
    must_mention: ["Smoking history", "Renal function/eGFR before CTU", "TURBT", "Single dose post-op Mitomycin C"],
    critical_fail: ["Failure to investigate upper tracts", "Suggesting major surgery without histology"]
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