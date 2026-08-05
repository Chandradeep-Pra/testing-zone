import { NextRequest, NextResponse } from "next/server";

import { geminiModel } from "@/lib/gemni";
import { getDefaultVivaCase, normalizeVivaCase, type VivaCaseRecord } from "@/lib/viva-case";

type ScoreRequest = {
  previousQA: Array<{ question: string; answer: string }>;
  vivaCase?: VivaCaseRecord;
};

export async function POST(req: NextRequest) {
  const { previousQA, vivaCase: rawVivaCase } = (await req.json()) as ScoreRequest;
  const vivaCase = rawVivaCase ? normalizeVivaCase(rawVivaCase) : getDefaultVivaCase();

  if (!Array.isArray(previousQA)) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const transcript = previousQA
    .map((q) => `Q: ${q.question}\nA: ${q.answer}`)
    .join("\n\n");

  const prompt = `
You are an FRCS Urology examiner.

Evaluate the candidate performance in this viva.

Case Title: ${vivaCase.case.title}
Case Stem: ${vivaCase.case.stem}
Objectives: ${vivaCase.case.objectives.join("; ")}
Must mention: ${vivaCase.marking_criteria.must_mention.join("; ")}
Critical fail: ${vivaCase.marking_criteria.critical_fail.join("; ")}

Assess coverage across the complete clinical pathway:
1. Assessment: symptoms, history, risk factors, examination and relevant background.
2. Investigations and interpretation: appropriate selection, interpretation and clinical relevance.
3. Management: options, recommendation, trade-offs, justification and safety.
4. Complications: important disease or chosen-treatment complications and their management.
5. Follow-up: review timing, surveillance, monitoring and safety netting.

Use the candidate's chosen safe treatment when judging whether their complications and follow-up are coherent.
Penalise unresolved critical safety omissions in the relevant domain reasoning, but do not penalise harmless wording or likely speech-to-text errors.

Score each domain from 4-8.

Domains:
1. basic_knowledge
2. higher_order_processing
3. clinical_skills
4. professionalism

Provide:

- score (4-8)
- little linient scoring
- use whole numbers only
- short summary
- detailed reasoning

Also provide:

- strengthsOverall (3-5 bullet points)
- weaknessesOverall (3-5 bullet points)
- improvementPlan (3-5 SHORT TOPICS - max 3-4 words each, NOT sentences. Examples: "Renal anatomy basics", "Imaging interpretation", "Infection management")

Transcript:
${transcript}

We are using Google speech to text, so there can be occasional transcription errors. Interpret likely intended medical terms fairly before scoring.

Return ONLY JSON in this format:

{
  "basic_knowledge": {
    "score": 6,
    "summary": "",
    "reason": ""
  },
  "higher_order_processing": {
    "score": 6,
    "summary": "",
    "reason": ""
  },
  "clinical_skills": {
    "score": 6,
    "summary": "",
    "reason": ""
  },
  "professionalism": {
    "score": 6,
    "summary": "",
    "reason": ""
  },
  "strengthsOverall": [],
  "weaknessesOverall": [],
  "improvementPlan": []
}
`;

  try {
    const result = await geminiModel.generateContent(prompt);
    const rawText = result.response?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (typeof rawText !== "string") {
      throw new Error("Unexpected Gemini response structure");
    }

    const evaluation = JSON.parse(
      rawText.replace(/```json/g, "").replace(/```/g, "").trim()
    );

    return NextResponse.json({
      caseTitle: vivaCase.case.title,
      ...evaluation,
    });
  } catch (err) {
    console.error("Score generation failed:", err);

    return NextResponse.json(
      { error: "Score generation failed" },
      { status: 500 }
    );
  }
}
