import { NextRequest, NextResponse } from "next/server";

import { geminiModel } from "@/lib/gemni";
import { getDefaultVivaCase, normalizeVivaCase, type VivaCaseRecord } from "@/lib/viva-case";

type FollowupRequest = {
  previousQA: Array<{ question: string; answer: string }>;
  exit?: boolean;
  shownExhibitIds?: string[];
  vivaCase?: VivaCaseRecord;
};

type ExhibitSelection = {
  link: string;
  file: string;
  url?: string;
  description: string;
  id: string;
} | null;

function getExhibit(vivaCase: VivaCaseRecord, shownExhibitIds: string[] = []): ExhibitSelection {
  if (!vivaCase.exhibits.length) {
    return null;
  }

  const shownSet = new Set(shownExhibitIds.map((id) => id.toLowerCase()));
  const nextExhibit = vivaCase.exhibits.find(
    (exhibit) => !shownSet.has(exhibit.id.toLowerCase())
  );

  if (!nextExhibit) {
    return null;
  }

  return {
    link: nextExhibit.label,
    file: nextExhibit.file || "",
    url: nextExhibit.url,
    description: nextExhibit.description,
    id: nextExhibit.id,
  };
}

function cleanResponse(text: string) {
  if (!text) return "Please continue.";

  return text
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .trim();
}

function formatRecentQA(previousQA: Array<{ question: string; answer: string }>) {
  return previousQA
    .slice(-4)
    .map(
      ({ question, answer }, index) =>
        `Q${index + 1}: ${question}\nA${index + 1}: ${answer || "[no answer yet]"}`
    )
    .join("\n\n");
}

function formatAvailableExhibits(vivaCase: VivaCaseRecord, shownExhibitIds: string[] = []) {
  const shownSet = new Set(shownExhibitIds.map((id) => id.toLowerCase()));

  return vivaCase.exhibits
    .filter((exhibit) => !shownSet.has(exhibit.id.toLowerCase()))
    .map((exhibit) => {
      const link = exhibit.url || (exhibit.file ? `/exhibits/${exhibit.file}` : null);
      return `- ${exhibit.id}: ${exhibit.label}${link ? ` (${link})` : ""}\n  Description: ${exhibit.description}`;
    })
    .join("\n");
}

export async function POST(req: NextRequest) {
  const {
    previousQA,
    exit,
    shownExhibitIds = [],
    vivaCase: rawVivaCase,
  } = (await req.json()) as FollowupRequest;

  const vivaCase = rawVivaCase ? normalizeVivaCase(rawVivaCase) : getDefaultVivaCase();

  if (!Array.isArray(previousQA)) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }

  if (exit) {
    const combinedQA = previousQA
      .map(({ question, answer }) => `Q: ${question}\nA: ${answer}`)
      .join("\n\n");

    const prompt = `
You are an FRCS examiner.

Case Title: ${vivaCase.case.title}
Case Stem: ${vivaCase.case.stem}

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
    const rawText = result.response?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (typeof rawText !== "string") {
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

  if (previousQA.length === 0) {
    return NextResponse.json({
      question: `${vivaCase.case.stem} How would you evaluate this patient?`,
      imageUsed: false,
      imageLink: null,
      imageDescription: null,
    });
  }

  const recentQA = formatRecentQA(previousQA);
  const availableExhibits = formatAvailableExhibits(vivaCase, shownExhibitIds);

  const prompt = `
You are an FRCS viva examiner tasked with generating a single, concise question for the candidate. 
Generate the next follow-up question like a viva examiner.

Recent conversation:
${recentQA}

If a candidate cannot completely answer a question on a particular topic , please move on to the next question from a different topic related to the case

If a candidate is requesting or enquiring about any investigation , provide the report findings most suitable to the case stem . 
The objective of the viva is to start from basic questions in management , discuss alternative treatment options , complications of the treatment.

Generate a single, focused follow-up question. Write only the question without any greetings, explanations, or additional context.
Make sure we stick to case of question while we generate a follow up questions which is -> ${vivaCase.case.stem}

Available exhibits:
${availableExhibits || "- none remaining"}

If the question asked seems to be from an exhibit description, set imageUsed true and return that exhibit link.
For image questions, ask the candidate to explain the findings from the image.
(Description should not be visible or mentioned to user it is for you to verify)

You MUST follow this exact output format.

Return ONLY plain text (NOT JSON, NOT markdown).

Format exactly like this:

question: <your question here>
imageUsed: true or false
imageLink: <full url or null>

Rules:
- Do NOT add commas
- Do NOT add quotes
- Do NOT add braces {}
- Do NOT add extra text before or after
- Each field must be on a new line
- If no image is needed, write:
  imageUsed: false
  imageLink: null
`;

  try {
    const result = await geminiModel.generateContent(prompt);
    const rawText = result.response?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (typeof rawText !== "string") {
      throw new Error("Unexpected Gemini response structure");
    }

    const text = cleanResponse(rawText);

    // detect imageUsed
    const imageUsed = /imageUsed:\s*true/i.test(text);

    // extract imageLink
    const imageLinkMatch = text.match(/imageLink:\s*((?:https?:\/\/|\/)[^\s,]+)/i);
    const imageLink = imageLinkMatch ? imageLinkMatch[1] : null;
    const imageId =
      imageLink
        ? vivaCase.exhibits.find((exhibit) => {
            const exhibitLink = exhibit.url || (exhibit.file ? `/exhibits/${exhibit.file}` : null);
            return exhibitLink === imageLink;
          })?.id ?? null
        : null;

    // clean question
  const question = text
  .replace(/question:\s*/i, "")
  .split(/\nimageUsed:/i)[0]   // 🔥 key fix
  .split(/\nimageLink:/i)[0]   // extra safety
  .trim();

    return NextResponse.json({
      question,
      imageUsed,
      imageLink,
      imageDescription: null,
      imageId,
    });

  } catch (error) {
    console.error("Viva generation error:", error);

    return NextResponse.json(
      { question: "I think I have lost my power here, I can't continue any more as I am tired !!!" },
      { status: 200 }
    );
  }
}
