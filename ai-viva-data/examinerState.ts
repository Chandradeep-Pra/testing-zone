export type ExaminerState = {
  questionsAsked: number;
  timeElapsedSec: number;

  dimensionScores: {
    basic_knowledge: number;
    higher_order: number;
    clinical_skills: number;
    professionalism: number;
  };

  // 👇 NEW (IMPORTANT)
  coveredObjectives: string[];

  imagesShown: string[];
  redFlags: string[];
};

export const createInitialExaminerState = (): ExaminerState => ({
  questionsAsked: 0,
  timeElapsedSec: 0,

  dimensionScores: {
    basic_knowledge: 4,
    higher_order: 4,
    clinical_skills: 4,
    professionalism: 4
  },

  // 👇 NEW
  coveredObjectives: [],

  imagesShown: [],
  redFlags: []
});
