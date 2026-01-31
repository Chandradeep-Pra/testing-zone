//@ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { vivaContext } from "@/ai-viva-data/vivaContext";
import {
  ExaminerState,
  createInitialExaminerState
} from "@/ai-viva-data/examinerState";
import { geminiModel } from "@/lib/gemni";
import { EXAMINER_SYSTEM_PROMPT } from "@/ai-viva-data/examinerPrompt";

/* ============================================================
   1. Gemini Output Normalisation (HARDENED)
============================================================ */
function normalizeGeminiResponse(raw: any) {
  if (!raw) return { type: "question", text: "Please continue.", action: null };

  if (typeof raw === "string") {
    try { return JSON.parse(raw); }
    catch { return { type: "question", text: raw, action: null }; }
  }

  if (raw?.text && typeof raw.text === "string") {
    try { return JSON.parse(raw.text); }
    catch {
      return {
        type: raw.type ?? "question",
        text: raw.text,
        action: raw.action ?? null,
        scoreDelta: raw.scoreDelta ?? null
      };
    }
  }

  if (raw?.type && raw?.text) return raw;

  return { type: "question", text: "Please continue.", action: null };
}

/* ============================================================
   2. Session Store (UPGRADED)
============================================================ */
const sessions = new Map<
  string,
  {
    examinerState: ExaminerState;
    usedExhibits: Set<string>;

    initialized: boolean;
    basePrompt: string;
    examinerMemory: string;
  }
>();

function getOrCreateSession(sessionId: string) {
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, {
      examinerState: createInitialExaminerState(),
      usedExhibits: new Set(),

      initialized: false,
      basePrompt: "",
      examinerMemory: ""
    });
  }
  return sessions.get(sessionId)!;
}

/* ============================================================
   3. Session Initialization (ONCE)
============================================================ */
function initializeSession(session) {
  session.basePrompt = `
${EXAMINER_SYSTEM_PROMPT}

CASE CONTEXT:
${vivaContext.case.stem}

AVAILABLE EXHIBITS:
${vivaContext.exhibits
  .map(e => `- ${e.id}: ${e.description}`)
  .join("\n")}
`;

  session.examinerMemory = "";
  session.initialized = true;
}

/* ============================================================
   4. Examiner Memory Update (LIGHTWEIGHT)
============================================================ */
function updateExaminerMemory(answer: string, state: ExaminerState, session) {
  const a = answer.toLowerCase();
  const notes: string[] = [];

  if (a.includes("malignancy") || a.includes("cancer")) {
    notes.push("Recognised malignancy risk.");
  }
  if (a.includes("ct") || a.includes("cystoscopy")) {
    notes.push("Identified appropriate investigations.");
  }
  if (a.includes("biopsy") || a.includes("bcg")) {
    notes.push("Outlined correct management steps.");
  }

  if (notes.length) {
    session.examinerMemory += "\n- " + notes.join(" ");
  }
}

/* ============================================================
   5. Gemini Caller (LEAN & CONTEXTUAL)
============================================================ */
async function callGemini({ session, userAnswer }: any) {
  const prompt = `
${session.basePrompt}

EXAMINER MEMORY:
${session.examinerMemory || "No prior answers yet."}

LAST CANDIDATE ANSWER:
"${userAnswer || ""}"

Ask the next SINGLE viva question.
`;

  const result = await geminiModel.generateContent(prompt);
  return normalizeGeminiResponse(result.response.text());
}

/* ============================================================
   6. Helpers
============================================================ */
function shouldEndViva(state: ExaminerState) {
  return (
    state.timeElapsedSec >= vivaContext.viva_rules.max_duration_minutes * 60 ||
    state.questionsAsked >= vivaContext.viva_rules.max_questions
  );
}

function snapScore(score: number): 4 | 5 | 6 | 7 | 8 {
  if (score < 4.5) return 4;
  if (score < 5.5) return 5;
  if (score < 6.5) return 6;
  if (score < 7.5) return 7;
  return 8;
}

function buildEndResponse(state: ExaminerState, session) {
  return {
    type: "end",
    finalScores: {
      basic_knowledge: snapScore(state.dimensionScores.basic_knowledge),
      higher_order: snapScore(state.dimensionScores.higher_order),
      clinical_skills: snapScore(state.dimensionScores.clinical_skills),
      professionalism: snapScore(state.dimensionScores.professionalism)
    },
    report: {
      summary: session.examinerMemory,
      coveredObjectives: state.coveredObjectives,
      level: vivaContext.case.level
    }
  };
}

/* ============================================================
   7. POST Handler (FINAL)
============================================================ */
export async function POST(req: NextRequest) {
  const { sessionId, userAnswer, timeElapsedSec } = await req.json();

  const session = getOrCreateSession(sessionId);
  const state = session.examinerState;

  if (!session.initialized) {
    initializeSession(session);
  }

  state.timeElapsedSec = timeElapsedSec;

  if (shouldEndViva(state)) {
    return NextResponse.json(buildEndResponse(state, session));
  }

  if (!userAnswer || !userAnswer.trim()) {
    return NextResponse.json({ type: "wait" });
  }

  updateExaminerMemory(userAnswer, state, session);

  let aiResponse;
  try {
    aiResponse = await callGemini({ session, userAnswer });
  } catch {
    aiResponse = {
      type: "question",
      text: "Taking everything into account, what would you do next?",
      action: null
    };
  }

  if (aiResponse.action?.startsWith("open-img-")) {
    const exhibitId = aiResponse.action.replace("open-img-", "");
    if (session.usedExhibits.has(exhibitId)) {
      aiResponse.action = null;
    } else {
      session.usedExhibits.add(exhibitId);
    }
  }

  if (aiResponse.scoreDelta) {
    for (const key of Object.keys(aiResponse.scoreDelta)) {
      state.dimensionScores[key] += aiResponse.scoreDelta[key];
    }
  }

  if (aiResponse.type === "question") {
    state.questionsAsked += 1;
  }

  return NextResponse.json(aiResponse);
}
