//@ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { vivaContext } from "@/ai-viva-data/vivaContext";
import {
  ExaminerState,
  createInitialExaminerState
} from "@/ai-viva-data/examinerState";
import { ConversationTurn } from "@/ai-viva-data/types";
import { geminiModel } from "@/lib/gemni";
import { EXAMINER_SYSTEM_PROMPT } from "@/ai-viva-data/examinerPrompt";

/* ----------------------------------------
   Normalize Gemini Output (HARDENED)
----------------------------------------- */
function normalizeGeminiResponse(raw: any) {
  if (!raw) {
    return { type: "question", text: "Please continue.", action: null };
  }

  // Gemini may return JSON string inside text
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch {
      return { type: "question", text: raw, action: null };
    }
  }

  if (raw?.text && typeof raw.text === "string") {
    try {
      return JSON.parse(raw.text);
    } catch {
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

/* ----------------------------------------
   Gemini Caller
----------------------------------------- */
async function callGemini({
  vivaContext,
  examinerState,
  conversation
}: {
  vivaContext: any;
  examinerState: ExaminerState;
  conversation: ConversationTurn[];
}) {
  const lastUserAnswer =
    conversation.slice().reverse().find(c => c.role === "user")?.text ?? "";

  const exhibitRegistry = vivaContext.exhibits
    .map((e: any) => `- ${e.id} → ${e.label}: ${e.description}`)
    .join("\n");

  const prompt = `
${EXAMINER_SYSTEM_PROMPT}

CASE CONTEXT:
${vivaContext.case.stem}

OBJECTIVES (INTERNAL):
${vivaContext.case.objectives.join("\n")}

AVAILABLE EXHIBITS (USE EXACT IDS ONLY):
${exhibitRegistry}

ALREADY COVERED OBJECTIVES:
${examinerState.coveredObjectives.length
  ? examinerState.coveredObjectives.join("\n")
  : "None"}

IMPORTANT RULES:
- Ask ONE examiner-style question only
- Never repeat a question
- Each exhibit may be requested AT MOST ONCE
- If candidate response is unclear, move forward
- After an exhibit, shift to management or escalation

RECENT CONVERSATION:
${conversation
  .slice(-8)
  .map(c => `${c.role.toUpperCase()}: ${c.text}`)
  .join("\n")}

LAST CANDIDATE ANSWER:
"${lastUserAnswer}"
`;

  const result = await geminiModel.generateContent(prompt);
  return normalizeGeminiResponse(result.response.text());
}

/* ----------------------------------------
   In-Memory Session Store
----------------------------------------- */
const sessions = new Map<
  string,
  {
    examinerState: ExaminerState;
    conversation: ConversationTurn[];
    usedExhibits: Set<string>;
  }
>();

function getOrCreateSession(sessionId: string) {
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, {
      examinerState: createInitialExaminerState(),
      conversation: [],
      usedExhibits: new Set()
    });
  }
  return sessions.get(sessionId)!;
}

/* ----------------------------------------
   Helpers
----------------------------------------- */
function shouldEndViva(state: ExaminerState) {
  return (
    state.timeElapsedSec >=
      vivaContext.viva_rules.max_duration_minutes * 60 ||
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

function buildEndResponse(state: ExaminerState) {
  return {
    type: "end",
    finalScores: {
      basic_knowledge: snapScore(state.dimensionScores.basic_knowledge),
      higher_order: snapScore(state.dimensionScores.higher_order),
      clinical_skills: snapScore(state.dimensionScores.clinical_skills),
      professionalism: snapScore(state.dimensionScores.professionalism)
    }
  };
}

/* ----------------------------------------
   POST Handler
----------------------------------------- */
export async function POST(req: NextRequest) {
  const { sessionId, userAnswer, timeElapsedSec } = await req.json();
  const session = getOrCreateSession(sessionId);
  const state = session.examinerState;

  state.timeElapsedSec = timeElapsedSec;

  if (shouldEndViva(state)) {
    return NextResponse.json(buildEndResponse(state));
  }

  /* ----------------------------------------
     Opening Question (ONCE)
  ----------------------------------------- */
  if (state.questionsAsked === 0) {
    const opening = {
      type: "question",
      text:
        "Good morning. I will ask you a series of focused questions about this case. " +
        "Please answer concisely. Let us begin. " +
        "What are the possible causes of painless hematuria?",
      action: null
    };

    state.questionsAsked += 1;
    session.conversation.push({ role: "ai", text: opening.text });

    return NextResponse.json(opening);
  }

  /* ----------------------------------------
     WAIT (voice-safe)
  ----------------------------------------- */
  if (!userAnswer || !userAnswer.trim()) {
    return NextResponse.json({ type: "wait" });
  }

  session.conversation.push({ role: "user", text: userAnswer });

  /* ----------------------------------------
     Heuristic Objective Tracking
  ----------------------------------------- */
  const a = userAnswer.toLowerCase();

  if (
    a.includes("ct") ||
    a.includes("urine") ||
    a.includes("cystoscopy")
  ) {
    if (!state.coveredObjectives.includes("investigations")) {
      state.coveredObjectives.push("investigations");
    }
  }

  if (
    a.includes("carcinoma") ||
    a.includes("tumor") ||
    a.includes("malignancy")
  ) {
    if (!state.coveredObjectives.includes("differential")) {
      state.coveredObjectives.push("differential");
    }
  }

  /* ----------------------------------------
     Gemini Question Generation
  ----------------------------------------- */
  let aiResponse;

  try {
    aiResponse = await callGemini({
      vivaContext,
      examinerState: state,
      conversation: session.conversation
    });
  } catch (err) {
    console.error("❌ GEMINI ERROR:", err);

    aiResponse = {
      type: "question",
      text:
        "Based on the information so far, how would you manage this patient?",
      action: null
    };
  }

  /* ----------------------------------------
     HARD EXHIBIT GUARD
  ----------------------------------------- */
  if (aiResponse.action?.startsWith("open-img-")) {
    const exhibitId = aiResponse.action.replace("open-img-", "");

    if (session.usedExhibits.has(exhibitId)) {
      aiResponse.action = null;
      aiResponse.text =
        "Taking all findings into account, what would be your next step in management?";
    } else {
      session.usedExhibits.add(exhibitId);
    }
  }

  /* ----------------------------------------
     Apply Scoring
  ----------------------------------------- */
  if (aiResponse.scoreDelta) {
    for (const key of Object.keys(aiResponse.scoreDelta)) {
      state.dimensionScores[key] += aiResponse.scoreDelta[key];
    }
  }

  if (aiResponse.type === "question") {
    state.questionsAsked += 1;
  }

  session.conversation.push({
    role: "ai",
    text: aiResponse.text
  });

  return NextResponse.json(aiResponse);
}
