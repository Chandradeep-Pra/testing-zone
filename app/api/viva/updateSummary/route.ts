import { NextRequest, NextResponse } from "next/server";

import { geminiModel } from "@/lib/gemni";
import { getDefaultVivaCase, normalizeVivaCase, type VivaCaseRecord } from "@/lib/viva-case";

type VivaStage =
  | "initial_assessment"
  | "investigations"
  | "interpretation"
  | "management"
  | "alternatives"
  | "complications"
  | "follow_up";

type SummaryRequest = {
  previousSummary?: string;
  currentStage?: VivaStage;
  coveredTopics?: string[];
  weakAreas?: string[];
  latestQA?: {
    question?: string;
    answer?: string;
  };
  vivaCase?: VivaCaseRecord;
};

const FALLBACK_STAGE: VivaStage = "initial_assessment";

function cleanJson(text: string) {
  return text.replace(/```json/g, "").replace(/```/g, "").trim();
}

function asStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string").slice(0, 8)
    : [];
}

function normalizeStage(value: unknown): VivaStage {
  const allowedStages: VivaStage[] = [
    "initial_assessment",
    "investigations",
    "interpretation",
    "management",
    "alternatives",
    "complications",
    "follow_up",
  ];

  return allowedStages.includes(value as VivaStage) ? (value as VivaStage) : FALLBACK_STAGE;
}

export async function POST(req: NextRequest) {
  try {
    const {
      previousSummary = "",
      currentStage = FALLBACK_STAGE,
      coveredTopics = [],
      weakAreas = [],
      latestQA,
      vivaCase: rawVivaCase,
    } = (await req.json()) as SummaryRequest;

    const vivaCase = rawVivaCase ? normalizeVivaCase(rawVivaCase) : getDefaultVivaCase();

    if (!latestQA?.question || typeof latestQA.answer !== "string") {
      return NextResponse.json({ error: "Invalid latest QA" }, { status: 400 });
    }

    const prompt = `
You are maintaining hidden state for an FRCS urology viva.

Case:
${vivaCase.case.stem}

Objectives:
${vivaCase.case.objectives.join("; ")}

Previous state:
Summary: ${previousSummary || "None yet"}
Stage: ${currentStage}
Covered topics: ${coveredTopics.join(", ") || "none"}
Weak areas: ${weakAreas.join(", ") || "none"}

Latest exchange:
Q: ${latestQA.question}
A: ${latestQA.answer || "[no answer]"}

Update the state for the next examiner question.
Keep summary under 55 words.
Use these stages only:
initial_assessment, investigations, interpretation, management, alternatives, complications, follow_up

Return JSON only:
{
  "summary": "",
  "currentStage": "investigations",
  "coveredTopics": [],
  "weakAreas": []
}
`;

    const result = await geminiModel.generateContent(prompt);
    const rawText = result.response?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (typeof rawText !== "string") {
      throw new Error("Unexpected Gemini response structure");
    }

    const parsed = JSON.parse(cleanJson(rawText)) as {
      summary?: unknown;
      currentStage?: unknown;
      coveredTopics?: unknown;
      weakAreas?: unknown;
    };

    console.log("Summary:", parsed.summary)
    return NextResponse.json({
      summary:
        typeof parsed.summary === "string"
          ? parsed.summary.slice(0, 500)
          : previousSummary,
      currentStage: normalizeStage(parsed.currentStage),
      coveredTopics: asStringArray(parsed.coveredTopics),
      weakAreas: asStringArray(parsed.weakAreas),
    });
  } catch (error) {
    console.error("Viva summary update failed:", error);

    return NextResponse.json(
      { error: "Summary update failed" },
      { status: 500 }
    );
  }
}
