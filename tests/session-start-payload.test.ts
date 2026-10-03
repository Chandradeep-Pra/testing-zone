import { normalizeSessionStartPayload } from "../lib/session-start";

const basic = normalizeSessionStartPayload({
  candidate: { name: "Rahul Sharma", email: "rahul@example.com" },
  case: {
    id: "case-hematuria-001",
    title: "Painless Hematuria Evaluation",
    level: "Intermediate",
    stem: "A 66 year gentleman referred for intermittent hematuria.",
    objectives: ["Evaluate the cause of painless hematuria"],
    exhibits: [],
    viva_rules: {
      max_duration_minutes: 10,
      max_questions: 10,
    },
  },
});

if (!basic.case.id || !basic.candidate.name) {
  throw new Error("startup payload normalization failed");
}

if (basic.candidate.email !== "rahul@example.com") {
  throw new Error("candidate email should be preserved");
}
