import { NextRequest, NextResponse } from "next/server";
import { geminiModel } from "@/lib/gemni";

export async function POST(req: NextRequest) {
  const { questionsAndAnswers } = await req.json();

  if (!Array.isArray(questionsAndAnswers)) {
    return NextResponse.json({ error: "Invalid input. Expected an array of questions and answers." }, { status: 400 });
  }

  const combinedQA = questionsAndAnswers.map(({ question, answer }) => `Q: ${question}\nA: ${answer}`).join("\n\n");

  const prompt = `
You are an FRCS examiner tasked with evaluating a candidate's responses across four dimensions: basic knowledge, higher order processing, clinical skills, and professionalism. Analyze all the provided questions and answers together and provide a single evaluation for each dimension. For each dimension, give a score (from 4 to 8) and a detailed reason for the score.

Questions and Answers:
${combinedQA}

Provide the evaluation in the following format:
{
  "basic_knowledge": { "score": <score>, "reason": "<reason>" },
  "higher_order_processing": { "score": <score>, "reason": "<reason>" },
  "clinical_skills": { "score": <score>, "reason": "<reason>" },
  "professionalism": { "score": <score>, "reason": "<reason>" }
}
`;

  try {
    const result = await geminiModel.generateContent(prompt);
    const rawResponse = result.response.text();

    // Attempt to sanitize and parse the response
    const sanitizedResponse = rawResponse.replace(/```json|```/g, "").trim();
    const evaluation = JSON.parse(sanitizedResponse);

    return NextResponse.json({ evaluation });
  } catch (error) {
    console.error("Error analyzing responses with Gemini:", error);
    return NextResponse.json({ error: "Failed to analyze responses. Ensure the Gemini response is valid JSON." }, { status: 500 });
  }
}