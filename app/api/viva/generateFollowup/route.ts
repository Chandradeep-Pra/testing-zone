import { NextRequest, NextResponse } from "next/server";
import { geminiModel } from "@/lib/gemni";
import { vivaContext } from "@/ai-viva-data/vivaContext";
import { link } from "fs";


/* -------------------------
   Exhibit Logic
------------------------- */

type ExhibitSelection = {
  link: string;
  file: string;
  description: string;
  id: string;
} | null;

function getExhibit(previousQA: any[], shownExhibitIds: string[] = []): ExhibitSelection {
  if (!vivaContext.exhibits || vivaContext.exhibits.length === 0) {
    return null;
  }

  // Convert shown IDs to a Set for faster lookup
  const shownSet = new Set(shownExhibitIds.map(id => id.toLowerCase()));

  // Find the first exhibit that hasn't been shown yet
  const nextExhibit = vivaContext.exhibits.find(
    (exhibit) => !shownSet.has(exhibit.id.toLowerCase())
  );

  if (nextExhibit) {
    return {
      link: nextExhibit.label,
      file: nextExhibit.file,
      description: nextExhibit.description,
      id: nextExhibit.id,
    };
  }

  // If all exhibits have been shown, return null (never show same image twice)
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
  const { previousQA, exit, shownExhibitIds = [] } = await req.json();

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

  const exhibit = getExhibit(previousQA, shownExhibitIds);

  const prompt = `
You are an FRCS viva examiner tasked with generating a single, concise question for the candidate. 
Your task is to generate a follow up question like a viva examiner.
This is previous QA: ${JSON.stringify(previousQA)}

${exhibit ? `Use the following image to inform your question:
Image Label: ${exhibit.link}
Image Description: ${exhibit.description}
The image description is only available to you (the examiner) and not to the candidates. 
You can ask questions based on it, but do not share the description with the candidate.` : "No images available for this question - proceed with follow-up questions based on the candidate's previous answers."}

Generate a single, focused follow-up question. Write only the question without any greetings, explanations, or additional context.
Make sure we stick to case of question while we generate a follow up questions ${vivaContext.case.stem}
`;

  try {
    const result = await geminiModel.generateContent(prompt);

    const question = cleanResponse(result.response.text());

    return NextResponse.json({
      question,
      imageUsed: !!exhibit,
      imageLink: exhibit ? `/exhibits/${exhibit.file}` : null,
      imageDescription: exhibit ? exhibit.description : null,
      imageId: exhibit ? exhibit.id : null,
    });
  } catch (error) {
    console.error("Viva generation error:", error);

    return NextResponse.json(
      { question: "I think I have lost my power here, I can't continue any more as I am tired !!!" },
      { status: 200 }
    );
  }
}