import { vivaContext } from "./vivaContext";

export const extractedHematuriaCase = {
  title: "Visible Hematuria (VH) - Case 1",
  startTime: "00:00",
  endTime: "52:25",
  stem: "A 50-year-old gentleman referred with Visible Hematuria (VH).",
  objectives: [
    "How to evaluate?",
    "Appropriate investigations for visible hematuria.",
    "Interpretation of cystoscopy findings.",
    "Management of non-muscle invasive bladder cancer (NMIBC).",
    "Role of urine cytology and intravesical chemotherapy (MMC).",
    "Understanding of risk stratification and treatment options for NMIBC."
  ],
  hiddenFacts: [
    "Patient has VH on and off for 3 months, no clots.",
    "Patient is a smoker, diabetic, and hypertensive.",
    "Digital Rectal Examination (DRE) reveals a 40g prostate with no nodules, other findings normal.",
    "CT scan shows no upper tract lesions.",
    "Cystoscopy images show multiple papillary bladder tumors.",
    "Histology result: T1 G3 Urothelial Carcinoma."
  ],
  markingCriteria: {
    pass: "Demonstrates a structured approach to evaluation (history, examination, investigations). Correctly identifies likely diagnosis from cystoscopy. Discusses management options for NMIBC including TURBT and adjuvant therapy. Shows awareness of counseling points and potential complications. Mentions risk stratification for NMIBC and appropriate follow-up.",
    fail: "Lacks a structured approach. Misses key investigations or evaluation steps. Inability to interpret images. Unfamiliarity with NMIBC management guidelines or indications for adjuvant therapy. Poor communication with the patient regarding risks and benefits."
  },
  exhibits: [
    {
      id: "video-slide-1",
      kind: "text",
      label: "Case Introduction",
      description: "Case 1: 50 year gentleman referred with VH? How to evaluate?"
    },
    {
      id: "video-slide-cysto",
      kind: "image",
      label: "Cystoscopy Images",
      description: "Cystoscopy images showing multiple papillary bladder tumors."
    }
  ]
};

export const teacherPersona = {
  name: "The Teacher from FRCS Session",
  description: "The examiner is supportive and encouraging, especially to students who are just starting. They provide clear instructions on the structure of the viva and emphasize the importance of preparation. While allowing students to lead their answers, they gently guide them back on track or challenge their assumptions with specific questions designed to test deeper knowledge or adherence to guidelines.",
  systemInstruction: "You are the medical examiner from the recording. Your tone is generally encouraging but firm, pushing students to think deeper and justify their responses. Provide clear initial instructions. When a student gives a superficial answer or makes a mistake, gently correct or guide them by asking follow-up questions. Always emphasize the importance of preparation and precise answers. After a 10-minute session, provide constructive feedback highlighting both strengths and areas for improvement. You value structured approaches and evidence-based reasoning. If a student mentions a clinical detail (like a comorbidity), be prepared to ask a follow-up question related to it, even if it's slightly 'outside the box' of the immediate case, to test their breadth of knowledge."
};

export const uroAiHematuriaCase = {
  ...vivaContext,
  id: "case-hematuria- uroai-001",
  isUroAiPowered: true,
  persona: teacherPersona,
  minedCase: extractedHematuriaCase,
  // Merge clinical data
  case: {
    ...vivaContext.case,
    stem: extractedHematuriaCase.stem,
    objectives: [...new Set([...vivaContext.case.objectives, ...extractedHematuriaCase.objectives])]
  },
  marking_criteria: {
    ...vivaContext.marking_criteria,
    must_mention: [...new Set([...vivaContext.marking_criteria.must_mention, extractedHematuriaCase.markingCriteria.pass])],
  }
};
