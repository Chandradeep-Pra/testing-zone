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

function getImageLink(exhibit: ExhibitSelection) {
  if (!exhibit) {
    return null;
  }

  if (exhibit.url) {
    return exhibit.url;
  }

  return exhibit.file ? `/exhibits/${exhibit.file}` : null;
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

  const exhibit = getExhibit(vivaCase, shownExhibitIds);

  const prompt = `
You are an expert FRCS Urology viva examiner. Your task is to generate a high-quality follow-up question for a candidate based on the previous interaction.

----------------------
PREVIOUS INTERACTION
----------------------
${JSON.stringify(previousQA)}

----------------------
CASE DETAILS
----------------------
Case Title: ${vivaCase.case.title}
Case Stem: ${vivaCase.case.stem}

Case Objectives:
${vivaCase.case.objectives.join("; ")}

----------------------
INSTRUCTIONS
----------------------
1. Generate ONE focused follow-up viva question.

2. The question MUST:
   - Be clinically relevant and aligned with the case title, stem, and objectives.
   - Progress naturally from the previous question and answer.
   - Test deeper reasoning (not simple recall).
   - Be at FRCS level difficulty.

3. OBJECTIVE COVERAGE (MANDATORY):
   - Ensure that ALL case objectives are tested across the conversation.
   - If any objective has not yet been addressed in the previous QA, PRIORITIZE generating a question that assesses it.
   - You may directly ask about an objective at any point if it has not yet been covered.

4. CLINICAL SCENARIO GENERATION:
   - You MAY introduce a new but relevant clinical situation related to the case to advance the viva.
   - The scenario must remain realistic and within the scope of the original case.

5. EXHIBIT USAGE (STRICT RULES):
   ${exhibit ? `
   - An exhibit is available:
     • Label: ${exhibit.link}
     • Description: ${exhibit.description}
   - ONLY reference or use the exhibit IF the follow-up question explicitly requires image interpretation.
   - Do NOT mention the exhibit unless it is clearly necessary and directly relevant.
   ` : `- No exhibit should be referenced.`}

6. OUTPUT FORMAT:
   - Return ONLY the follow-up question.
   - Do NOT include explanations, answers, or commentary.
   - Keep wording concise, natural, and examiner-like.

----------------------
GOAL
----------------------
The goal is to simulate a real FRCS viva where the examiner:
- Adapts dynamically to candidate responses
- Covers all key objectives
- Escalates complexity appropriately
- Introduces realistic variations when needed
`;

console.log(prompt)

  try {
    const result = await geminiModel.generateContent(prompt);
    const rawText = result.response?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (typeof rawText !== "string") {
      throw new Error("Unexpected Gemini response structure");
    }

    return NextResponse.json({
      question: cleanResponse(rawText),
      imageUsed: Boolean(exhibit),
      imageLink: getImageLink(exhibit),
      imageDescription: exhibit?.description || null,
      imageId: exhibit?.id || null,
    });
  } catch (error) {
    console.error("Viva generation error:", error);

    return NextResponse.json(
      { question: "I think I have lost my power here, I can't continue any more as I am tired !!!" },
      { status: 200 }
    );
  }
}