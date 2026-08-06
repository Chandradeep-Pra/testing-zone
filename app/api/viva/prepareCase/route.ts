import { NextRequest, NextResponse } from "next/server";

import { geminiModel } from "@/lib/gemni";
import { getDefaultVivaCase, normalizeVivaCase, type VivaCaseRecord } from "@/lib/viva-case";

type PrepareCaseRequest = { vivaCase?: VivaCaseRecord };

export async function POST(req: NextRequest) {
  const { vivaCase: rawVivaCase } = (await req.json()) as PrepareCaseRequest;
  const vivaCase = rawVivaCase ? normalizeVivaCase(rawVivaCase) : getDefaultVivaCase();
  const exhibits = vivaCase.exhibits.map((item) => ({
    id: item.id,
    label: item.label,
    description: item.description,
  }));

  const prompt = `
Create a coherent FRCS Urology viva patient narrative from the supplied case.

Case stem:
${vivaCase.case.stem}

Case objectives:
${vivaCase.case.objectives.join("; ") || "none supplied"}

Exhibits:
${JSON.stringify(exhibits)}

Build one consistent patient story that can be followed throughout a spoken viva.
Organise it under exactly these headings:
ASSESSMENT
INVESTIGATIONS
MANAGEMENT
COMPLICATIONS
FOLLOW_UP

Under each heading provide concise examiner-only facts and clinical discussion goals.
Assessment must cover symptoms, risk factors, associated symptoms, medical/surgical history and examination.
Investigations must use supplied exhibits and case facts.
Management, complications and follow-up must remain consistent with the same patient.
Do not contradict the stem. Do not fabricate a new diagnosis or unsupported test result.
This is hidden examiner context, not a question and not feedback to the candidate.
`;

  try {
    const generation = geminiModel.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 700, temperature: 0.15 },
    });
    const result = await Promise.race([
      generation,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Case preparation timed out")), 15_000),
      ),
    ]);
    const story = result.response?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!story) throw new Error("Empty prepared case");
    return NextResponse.json({ story });
  } catch (error) {
    console.error("Case preparation error:", error);
    return NextResponse.json({
      story: `ASSESSMENT\n${vivaCase.case.stem}\nINVESTIGATIONS\nUse only supplied case investigations and exhibits.\nMANAGEMENT\nDiscuss case-relevant conservative, medical and surgical care.\nCOMPLICATIONS\nDiscuss incidence, recognition and management of treatment complications.\nFOLLOW_UP\nDiscuss surveillance, counselling and safety-netting.`,
    });
  }
}
