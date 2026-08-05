import { NextRequest, NextResponse } from "next/server";

import { geminiModel } from "@/lib/gemni";
import { getDefaultVivaCase, normalizeVivaCase, type VivaCaseRecord } from "@/lib/viva-case";
import { CALM_VIVA_PHASES } from "@/lib/viva-flow";

type VivaStage =
  | "assessment"
  | "investigations"
  | "management"
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

const FALLBACK_STAGE: VivaStage = "assessment";

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
    "assessment",
    "investigations",
    "management",
    "complications",
    "follow_up",
  ];

  return allowedStages.includes(value as VivaStage) ? (value as VivaStage) : FALLBACK_STAGE;
}

function guardStageProgression(current: VivaStage, proposed: VivaStage): VivaStage {
  const currentIndex = CALM_VIVA_PHASES.indexOf(current);
  const proposedIndex = CALM_VIVA_PHASES.indexOf(proposed);

  if (proposedIndex <= currentIndex) return current;
  return CALM_VIVA_PHASES[Math.min(currentIndex + 1, CALM_VIVA_PHASES.length - 1)];
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
Maintain compact hidden state for a calm FRCS urology viva.

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

Update state for the next question.
Order: assessment -> investigations/interpretation -> management/alternatives -> complications -> follow_up.
Infer likely STT terms; accept equivalent clinical meaning. Never move backwards or linger on non-critical omissions.
Keep unsafe omissions in weakAreas. Preserve the candidate's diagnosis and treatment in the summary.
Summary: maximum 55 words. Stages: assessment, investigations, management, complications, follow_up.

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
    const normalizedCurrentStage = normalizeStage(currentStage);
    const proposedStage = normalizeStage(parsed.currentStage);

    return NextResponse.json({
      summary:
        typeof parsed.summary === "string"
          ? parsed.summary.slice(0, 500)
          : previousSummary,
      currentStage: guardStageProgression(normalizedCurrentStage, proposedStage),
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
