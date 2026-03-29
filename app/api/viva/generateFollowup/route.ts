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
   Previous QA Sanitizer
------------------------- */

function sanitizePreviousQA(previousQA: any[], maxEntries: number = 10, maxChars: number = 3000): string {
  if (!Array.isArray(previousQA) || previousQA.length === 0) {
    return "[]";
  }

  // Limit to most recent entries
  const limited = previousQA.slice(-maxEntries);

  // Sanitize each entry
  const sanitized = limited.map(({ question, answer }) => {
    // Strip non-printable characters and normalize whitespace
    const cleanText = (text: string): string => {
      if (typeof text !== 'string') return '';
      return text
        .replace(/[\x00-\x1F\x7F-\x9F]/g, '') // Remove control characters
        .replace(/\s+/g, ' ') // Normalize whitespace
        .replace(/[<>{}]/g, '') // Remove potentially dangerous characters
        .trim();
    };

    return {
      question: cleanText(question),
      answer: cleanText(answer)
    };
  });

  // Convert to JSON and truncate if needed
  let jsonString = JSON.stringify(sanitized);

  if (jsonString.length > maxChars) {
    // Truncate entries from the beginning until we're under the limit
    let truncated = sanitized;
    while (truncated.length > 1 && JSON.stringify(truncated).length > maxChars) {
      truncated = truncated.slice(1);
    }
    jsonString = JSON.stringify(truncated);

    // If still too long, truncate the string itself
    if (jsonString.length > maxChars) {
      jsonString = jsonString.substring(0, maxChars - 3) + '...';
    }
  }

  return jsonString;
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

    const text = cleanResponse(rawText);

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
You are a FRCS Urology viva examiner tasked with generation of a follow up question.
This is previous QA which has been asked to the student: ${sanitizePreviousQA(previousQA)}

Generate a single, focused follow-up question. Write only the question without any greetings, explanations, or additional context.
Make sure we stick to case of question while we generate a follow up questions which is -> ${vivaContext.case.stem}

${exhibit ? `There is an image available for the study.
Image Label: ${exhibit.link}
You may generate a follow-up question related to the image if you feel the candidate's response is going along similar lines.

` : ""}


`;

  try {
    const result = await geminiModel.generateContent(prompt);
    console.log("Passed Prompt :", prompt);

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

    const question = cleanResponse(rawText);

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