import { NextRequest, NextResponse } from "next/server";

import { vivaContext } from "@/ai-viva-data/vivaContext";
import { ExaminerState, createInitialExaminerState } from "@/ai-viva-data/examinerState";
import { EXAMINER_SYSTEM_PROMPT } from "@/ai-viva-data/examinerPrompt";
import { geminiModel } from "@/lib/gemni";

type GeminiResponse = {
  type?: string;
  text?: string;
  action?: string | null;
  scoreDelta?: Partial<ExaminerState["dimensionScores"]> | null;
};

type SessionRecord = {
  examinerState: ExaminerState;
  usedExhibits: Set<string>;
  initialized: boolean;
  basePrompt: string;
  examinerMemory: string;
};

type NextRequestBody = {
  sessionId: string;
  userAnswer?: string;
  timeElapsedSec: number;
};

function normalizeGeminiResponse(raw: unknown) {
  if (!raw) return { type: "question", text: "Please continue.", action: null };

  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as GeminiResponse;
    } catch {
      return { type: "question", text: raw, action: null };
    }
  }

  if (typeof raw === "object" && raw !== null && "text" in raw) {
    const candidate = raw as GeminiResponse;
    if (typeof candidate.text === "string") {
      try {
        return JSON.parse(candidate.text) as GeminiResponse;
      } catch {
        return {
          type: candidate.type ?? "question",
          text: candidate.text,
          action: candidate.action ?? null,
          scoreDelta: candidate.scoreDelta ?? null,
        };
      }
    }
  }

  if (typeof raw === "object" && raw !== null && "type" in raw && "text" in raw) {
    return raw as GeminiResponse;
  }

  return { type: "question", text: "Please continue.", action: null };
}

const sessions = new Map<string, SessionRecord>();

function getOrCreateSession(sessionId: string) {
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, {
      examinerState: createInitialExaminerState(),
      usedExhibits: new Set(),
      initialized: false,
      basePrompt: "",
      examinerMemory: "",
    });
  }

  return sessions.get(sessionId)!;
}

function initializeSession(session: SessionRecord) {
  session.basePrompt = `
${EXAMINER_SYSTEM_PROMPT}

CASE CONTEXT:
${vivaContext.case.stem}

AVAILABLE EXHIBITS:
${vivaContext.exhibits.map((e) => `- ${e.id}: ${e.description}`).join("\n")}
`;
  session.initialized = true;
}

function updateExaminerMemory(answer: string, session: SessionRecord) {
  const a = answer.toLowerCase();
  const notes: string[] = [];

  if (a.includes("history") || a.includes("examination")) {
    notes.push("Outlined appropriate clinical evaluation.");
  }
  if (a.includes("ct") || a.includes("cystoscopy")) {
    notes.push("Selected correct investigations.");
  }
  if (a.includes("turbt")) {
    notes.push("Planned TURBT.");
  }
  if (a.includes("mitomycin")) {
    notes.push("Appropriate use of intravesical chemotherapy.");
  }
  if (a.includes("pt1") || a.includes("high grade")) {
    notes.push("Recognised high-risk NMIBC.");
  }
  if (a.includes("bcg")) {
    notes.push("Discussed intravesical BCG therapy.");
  }

  if (notes.length) {
    session.examinerMemory += "\n- " + notes.join(" ");
  }
}

async function callGemini({
  session,
  lastAnswer,
}: {
  session: SessionRecord;
  lastAnswer: string;
}) {
  const prompt = `
${session.basePrompt}

EXAMINER MEMORY:
${session.examinerMemory || "No prior answers yet."}

LAST CANDIDATE ANSWER:
"${lastAnswer || ""}"

Ask the next SINGLE viva question.
`;

  const result = await geminiModel.generateContent(prompt);
  const rawText = result.response?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (typeof rawText !== "string") {
    throw new Error("Unexpected Gemini response structure");
  }

  const cleaned = rawText
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();

  return normalizeGeminiResponse(cleaned);
}

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

function buildEndResponse(state: ExaminerState, session: SessionRecord) {
  return {
    type: "end",
    finalScores: {
      basic_knowledge: snapScore(state.dimensionScores.basic_knowledge),
      higher_order: snapScore(state.dimensionScores.higher_order),
      clinical_skills: snapScore(state.dimensionScores.clinical_skills),
      professionalism: snapScore(state.dimensionScores.professionalism),
    },
    report: {
      summary: session.examinerMemory,
      coveredObjectives: state.coveredObjectives,
      level: vivaContext.case.level,
    },
  };
}

export async function POST(req: NextRequest) {
  const { sessionId, userAnswer, timeElapsedSec } = (await req.json()) as NextRequestBody;

  const session = getOrCreateSession(sessionId);
  const state = session.examinerState;

  if (!session.initialized) {
    initializeSession(session);
  }

  state.timeElapsedSec = timeElapsedSec;

  if (shouldEndViva(state)) {
    return NextResponse.json(buildEndResponse(state, session));
  }

  if (state.questionsAsked === 0) {
    const aiResponse = await callGemini({
      session,
      lastAnswer: "",
    });

    state.questionsAsked += 1;
    return NextResponse.json(aiResponse);
  }

  if (!userAnswer || !userAnswer.trim()) {
    return NextResponse.json({ type: "wait" });
  }

  updateExaminerMemory(userAnswer, session);

  let aiResponse: GeminiResponse;
  try {
    aiResponse = await callGemini({
      session,
      lastAnswer: userAnswer,
    });
  } catch {
    aiResponse = {
      type: "question",
      text: "What would you do next?",
      action: null,
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
    state.dimensionScores = {
      basic_knowledge:
        state.dimensionScores.basic_knowledge + (aiResponse.scoreDelta.basic_knowledge ?? 0),
      higher_order:
        state.dimensionScores.higher_order + (aiResponse.scoreDelta.higher_order ?? 0),
      clinical_skills:
        state.dimensionScores.clinical_skills + (aiResponse.scoreDelta.clinical_skills ?? 0),
      professionalism:
        state.dimensionScores.professionalism + (aiResponse.scoreDelta.professionalism ?? 0),
    };
  }

  if (aiResponse.type === "question") {
    state.questionsAsked += 1;
  }

  if (shouldEndViva(state)) {
    return NextResponse.json(buildEndResponse(state, session));
  }

  return NextResponse.json(aiResponse);
}
