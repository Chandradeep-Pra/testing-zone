import { NextRequest, NextResponse } from "next/server";
import { geminiModel } from "@/lib/gemni";
import { vivaContext } from "@/ai-viva-data/vivaContext";

/* -------------------------
   Stage Detection
------------------------- */

function detectStage(previousQA: any[]) {

  const q = previousQA.length;

  if (q === 0) return "history";
  if (q <= 2) return "examination";
  if (q <= 4) return "investigations";
  if (q <= 6) return "diagnosis";

  return "treatment";
}

/* -------------------------
   Exhibit Logic
------------------------- */

function getExhibit(stage: string) {

  if (stage === "diagnosis") {
    return vivaContext.exhibits[0] ?? null;
  }

  if (stage === "treatment") {
    return vivaContext.exhibits[1] ?? null;
  }

  return null;
}

/* -------------------------
   Gemini Response Cleaner
------------------------- */

function cleanResponse(text: string) {
  if (!text) return "Please continue.";

  return text
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .trim();
}

/* -------------------------
   Main Handler
------------------------- */

export async function POST(req: NextRequest) {
  const { previousQA, exit } = await req.json();

  if (!Array.isArray(previousQA)) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }

  /* -------------------------
     Exit Mode (Evaluation)
  ------------------------- */

  if (exit) {
    const combinedQA = previousQA
      .map(({ question, answer }) => `Q: ${question}\nA: ${answer}`)
      .join("\n\n");

    const prompt = `
You are an FRCS examiner.

Evaluate the candidate across:

1. basic_knowledge
2. higher_order_processing
3. clinical_skills
4. professionalism

Questions and Answers:
${combinedQA}

Return JSON only.
`;

    const result = await geminiModel.generateContent(prompt);
    const text = cleanResponse(result.response.text());

    try {
      const evaluation = JSON.parse(text);
      return NextResponse.json({ evaluation });
    } catch {
      return NextResponse.json({ evaluation: text });
    }
  }

  /* -------------------------
     First Question
  ------------------------- */

  if (previousQA.length === 0) {
    const question = `${vivaContext.case.stem} How would you evaluate this patient?`;

    return NextResponse.json({
      question,
      imageUsed: false,
      imageLink: null,
      imageDescription: null,
    });
  }

  /* -------------------------
     Viva Intelligence
  ------------------------- */

  const stage = detectStage(previousQA);
  const exhibit = getExhibit(stage);

  const history = previousQA
    .slice(-4) // keep prompt small for speed
    .map((q: any) => `Q:${q.question}\nA:${q.answer}`)
    .join("\n");

  const prompt = `
You are a UK FRCS Urology examiner.

Case:
${vivaContext.case.stem}

Stage:
${stage}

Conversation:
${history}
Rules:
- Ask ONE short viva question only.
- Maintain formal UK consultant examiner tone.
- Questions must follow clinical reasoning.
- Challenge incomplete or unsafe answers.
- Do not explain the case.
- Avoid long multi-part questions.
- Do not exceed 2 questions per stage.

Stage guide:
history → key symptoms, duration, risk factors
examination → focused physical examination
investigations → appropriate tests and rationale
diagnosis → interpret findings or imaging
treatment → management plan and options

Exhibit:
${exhibit ? "Imaging shown to candidate" : "None"}

Ask the next question.
`;

  try {
    const result = await geminiModel.generateContent(prompt);

    const question = cleanResponse(result.response.text());

    return NextResponse.json({
      question,
      imageUsed: !!exhibit,
      imageLink: exhibit ? `/exhibits/${exhibit.file}` : null,
      imageDescription: exhibit ? exhibit.description : null,
    });
  } catch (error) {
    console.error("Viva generation error:", error);

    return NextResponse.json(
      { question: "I think I have lost my power here, I can't continue any more as I am tired !!!" },
      { status: 200 }
    );
  }
}