import { NextRequest, NextResponse } from "next/server";
import { geminiModel } from "@/lib/gemni";
import { vivaContext } from "@/ai-viva-data/vivaContext";

/* ----------------------------------------
   Normalize Gemini Output
----------------------------------------- */
function normalizeGeminiResponse(raw: any) {
  if (!raw) {
    return { type: "question", text: "Failed to generate a question.", action: null };
  }

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
      };
    }
  }

  if (raw?.type && raw?.text) return raw;

  return { type: "question", text: "Failed to generate a question.", action: null };
}

/* ----------------------------------------
   POST Handler
----------------------------------------- */
export async function POST(req: NextRequest) {
  const { previousQA, imageDetails } = await req.json();

  console.log(previousQA);

  if (!Array.isArray(previousQA) || !Array.isArray(imageDetails)) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }

  /* -------------------------------------------------
     🔑 FIRST QUESTION (DETERMINISTIC, NO GEMINI)
  -------------------------------------------------- */
  if (previousQA.length === 0) {
    return NextResponse.json({
      question: `${vivaContext.case.stem} How would you assess this patient initially?`,
      imageDetails,
    });
  }

  /* -------------------------------------------------
     FOLLOW-UPS (GEMINI-DRIVEN)
  -------------------------------------------------- */
  const lastQuestions = previousQA.map((qa) => `Q: ${qa.question}`).join("\n");
  const lastAnswers = previousQA.map((qa) => `A: ${qa.answer}`).join("\n");

  const availableImage = imageDetails.find((img) => img.available);

  const prompt = `

You are an FRCS viva examiner tasked with generating a single, concise question for the candidate. Follow these rules:

1. Generate a follow-up question based on the context.
2. Generate a follow-up question based on the last questions and answers provided.

CONTEXT:
${
  availableImage
    ? `IMAGE DETAILS:
- Name: ${availableImage.image_name}
- Description: ${availableImage.image_description}

Mark the image as used: true.`
    : `PREVIOUS QUESTIONS AND ANSWERS:
${lastQuestions}

${lastAnswers}`
}

Write the question now without any greetings or additional context.
`;

  if (availableImage) {
    // mark image as used (mutates session copy)
    availableImage.available = false;
  }

  try {
    const result = await geminiModel.generateContent(prompt);

    console.log("Prompt:", prompt)

    console.log("Raw Gemini Response:", result.response.text());

    const normalizedResponse = normalizeGeminiResponse(result.response.text());

    return NextResponse.json({
      question: normalizedResponse.text,
      imageDetails,
    });
  } catch (error) {
    console.error("Error generating follow-up question:", error);
    return NextResponse.json(
      { error: "Failed to generate follow-up question." },
      { status: 500 }
    );
  }
}
