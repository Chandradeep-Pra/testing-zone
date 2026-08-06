import { NextRequest, NextResponse } from "next/server";

import { geminiModel } from "@/lib/gemni";
import { normalizeClinicalEvaluation, type VivaClinicalState } from "@/lib/viva-clinical-state";
import { getDefaultVivaCase, normalizeVivaCase, type VivaCaseRecord } from "@/lib/viva-case";
import { getVivaStage } from "@/lib/viva-followup";

type EvaluationRequest = {
  vivaCase?: VivaCaseRecord;
  caseStory?: string;
  stage?: string;
  question?: string;
  answer?: string;
  clinicalState?: VivaClinicalState;
};

function extractJson(text: string) {
  const cleaned = text.replace(/```json|```/gi, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("Evaluation JSON missing");
  return JSON.parse(cleaned.slice(start, end + 1));
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as EvaluationRequest;
  const vivaCase = body.vivaCase ? normalizeVivaCase(body.vivaCase) : getDefaultVivaCase();
  const stage = getVivaStage(body.stage || "assessment");
  const question = typeof body.question === "string" ? body.question.trim() : "";
  const answer = typeof body.answer === "string" ? body.answer.trim() : "";

  if (!question || !answer) {
    return NextResponse.json({ evaluation: normalizeClinicalEvaluation({}) });
  }

  const prompt = `
You are the hidden clinical reasoning evaluator for an FRCS Urology viva.
Evaluate only the candidate's latest answer against the supplied case. Do not generate the next question.

Case stem: ${vivaCase.case.stem}
Hidden case narrative: ${body.caseStory || "not supplied"}
Current stage: ${stage}
Examiner question: ${question}
Candidate answer: ${answer}
Existing clinical state: ${JSON.stringify(body.clinicalState || {})}

Distinguish what was addressed, correct, incomplete, incorrect, or unsafe.
Transcription may contain phonetic medical errors such as "to RBT" for TURBT or "CT diagram" for CT urogram; interpret obvious terms from context without inventing content.
If the candidate answers a different clinical issue, identify the missed target and recommend challenge or clarify.
Recommend exactly one discussion action: clarify, challenge, justify, apply_new_fact, compare_options, prioritise, or advance_topic.
The nextDiscussionTarget must be a narrow patient-specific issue, never a request to repeat the whole answer.

Return JSON only with this shape:
{
  "addressedTopics": ["..."],
  "correctClaims": ["..."],
  "incompleteClaims": ["..."],
  "incorrectClaims": ["..."],
  "unsafeClaims": ["..."],
  "candidatePlan": ["..."],
  "workingDiagnosis": "... or empty",
  "nextDiscussionTarget": "... or empty",
  "recommendedAction": "clarify|challenge|justify|apply_new_fact|compare_options|prioritise|advance_topic",
  "answerAdequate": true or false
}
`;

  try {
    const generation = geminiModel.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 450, temperature: 0.05 },
    });
    const result = await Promise.race([
      generation,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Answer evaluation timed out")), 10_000),
      ),
    ]);
    const raw = result.response?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (typeof raw !== "string") throw new Error("Invalid evaluation response");
    return NextResponse.json({ evaluation: normalizeClinicalEvaluation(extractJson(raw)) });
  } catch (error) {
    console.error("Answer evaluation error:", error);
    return NextResponse.json({
      evaluation: normalizeClinicalEvaluation({
        addressedTopics: [],
        incompleteClaims: [`The response to "${question}" requires focused clarification`],
        candidatePlan: [],
        nextDiscussionTarget: "the specific reasoning behind the candidate's latest answer",
        recommendedAction: "clarify",
        answerAdequate: false,
      }),
    });
  }
}
