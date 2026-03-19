import { NextRequest, NextResponse } from "next/server";
import { geminiModel } from "@/lib/gemni";

export async function POST(req: NextRequest) {

  const { previousQA } = await req.json();

  if (!Array.isArray(previousQA)) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const transcript = previousQA
    .map((q: any) => `Q: ${q.question}\nA: ${q.answer}`)
    .join("\n\n");

  const prompt = `
You are an FRCS Urology examiner.

Evaluate the candidate performance in this viva.

Score each domain from 4–8.

Domains:
1. basic_knowledge
2. higher_order_processing
3. clinical_skills
4. professionalism

Provide:

• score (4-8)
• short summary
• detailed reasoning

Also provide:

• strengthsOverall (3–5 bullet points)
• weaknessesOverall (3–5 bullet points)
• improvementPlan (3–5 SHORT TOPICS - max 3-4 words each, NOT sentences. Examples: "Renal anatomy basics", "Imaging interpretation", "Infection management")

Transcript:
${transcript}

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

    let rawText = null;
    if (
      result.response &&
      result.response.candidates &&
      result.response.candidates[0] &&
      result.response.candidates[0].content &&
      result.response.candidates[0].content.parts &&
      result.response.candidates[0].content.parts[0] &&
      typeof result.response.candidates[0].content.parts[0].text === 'string'
    ) {
      rawText = result.response.candidates[0].content.parts[0].text;
    } else {
      throw new Error("Unexpected Gemini response structure");
    }

    const raw = rawText
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    const evaluation = JSON.parse(raw);

    return NextResponse.json(evaluation);

  } catch (err) {

    console.error("Score generation failed:", err);

    return NextResponse.json(
      { error: "Score generation failed" },
      { status: 500 }
    );
  }
}