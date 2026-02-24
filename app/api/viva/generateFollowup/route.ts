import { NextRequest, NextResponse } from "next/server";
import { geminiModel } from "@/lib/gemni";
import { vivaContext } from "@/ai-viva-data/vivaContext";

function normalizeGeminiResponse(raw: any) {
  if (!raw) {
    return { type: "question", text: "Failed to generate a question.", action: null };
  }
  if (typeof raw === "string") {
    try {
      // Remove markdown code blocks if present
      const cleaned = raw.replace(/```json|```/g, "").trim();
      return JSON.parse(cleaned);
    } catch {
      return { type: "question", text: raw, action: null };
    }
  }
  return raw;
}

// Image details remain as per your requirement
const IMAGE_DETAILS = [
  {
    link: "https://res.cloudinary.com/dvdt6jfo8/image/upload/v1770191268/PHOTO-2026-01-23-21-20-50_eqkazp.jpg",
    description: "CT scan shows 3 cm polyploidal enhancing mass arising from the base of the bladder. Upper tracts are normal.",
    available: true,
  },
  {
    link: "https://res.cloudinary.com/dvdt6jfo8/image/upload/v1770195606/PHOTO-2025-12-11-18-24-41_bkmjxj.jpg",
    description: "Cystoscopy shows papillary bladder tumor from the posterior wall of the bladder.",
    available: true,
  },
];

const SCORING_PARAMS = { /* ... (Keep your existing SCORING_PARAMS object here) ... */ };

export async function POST(req: NextRequest) {
  const { previousQA, exit } = await req.json();

  if (!Array.isArray(previousQA)) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }

  /* -------------------------------------------------
     EXIT EVALUATION MODE
  -------------------------------------------------- */
  if (exit) {
    const combinedQA = previousQA.map(({ question, answer }) => `Q: ${question}\nA: ${answer}`).join("\n\n");
    
    const exitPrompt = `
      You are a Senior FRCS Examiner. Evaluate the candidate's performance based on this specific case context:
      ${JSON.stringify(vivaContext.case)}
      
      MARKING GUIDELINES:
      - Essential Points to cover: ${vivaContext.marking_criteria.must_mention.join(", ")}
      - Critical Fails (Auto-fail if breached): ${vivaContext.marking_criteria.critical_fail.join(", ")}

      SCORING RUBRIC:
      ${JSON.stringify(SCORING_PARAMS)}

      TRANSCRIPT:
      ${combinedQA}

      Provide a formal evaluation in JSON format:
      {
        "basic_knowledge": { "score": <4-8>, "reason": "<Detailed surgical justification>" },
        "higher_order_processing": { "score": <4-8>, "reason": "<Ability to synthesize guidelines/data>" },
        "clinical_skills": { "score": <4-8>, "reason": "<Diagnostic and management logic>" },
        "professionalism": { "score": <4-8>, "reason": "<Communication style and safety awareness>" }
      }
    `;

    try {
      const result = await geminiModel.generateContent(exitPrompt);
      const evaluation = JSON.parse(result.response.text().replace(/```json|```/g, "").trim());
      return NextResponse.json({ evaluation });
    } catch (error) {
      return NextResponse.json({ error: "Evaluation failed." }, { status: 500 });
    }
  }

  /* -------------------------------------------------
     🔑 FIRST QUESTION
  -------------------------------------------------- */
  if (previousQA.length === 0) {
    return NextResponse.json({
      question: `${vivaContext.case.stem} How would you assess this patient in the clinic?`,
      imageUsed: false,
      imageLink: null,
    });
  }

  /* -------------------------------------------------
     FOLLOW-UPS (FRCS GRADE)
  -------------------------------------------------- */
  const availableImage = IMAGE_DETAILS.find((img) => img.available);

  const followUpPrompt = `
    ROLE: You are a strict, formal FRCS (Urol) Examiner. No small talk. No feedback like "Correct" or "Good."
    
    CASE CONTEXT:
    - Stem: ${vivaContext.case.stem}
    - Objectives: ${vivaContext.case.objectives.join(", ")}
    - Ground Truth (Imaging): ${vivaContext.exhibits.map(e => e.description).join(" | ")}
    - Safety/Critical Fails: ${vivaContext.marking_criteria.critical_fail.join(", ")}

    CANDIDATE HISTORY:
    ${JSON.stringify(previousQA)}

    TASK:
    1. Assess the candidate's last answer. If it's shallow, "drill down" into technical specifics (e.g., TNM staging, specific surgical steps, or guideline-based rationale).
    2. Follow the "Viva Ladder": Start with diagnosis -> investigations -> management -> handling complications.
    3. If the candidate mentions an investigation (e.g., CT or Cystoscopy) and it is available in the exhibits, provide the image.
    4. Keep questions high-level (FRCS Exit Exam standard). Focus on clinical safety and evidence-based practice (BAUS/NICE).
    5. Ask exactly ONE question. 

    If the candidate asks to stop or the maximum of 10 questions is reached, say "The viva is concluded. Thank you." and append EXACTLY: END!!!

    RESPONSE FORMAT (JSON ONLY):
    {
      "type": "question",
      "text": "Your crisp surgical question here",
      "action": "SHOW_IMAGE or null"
    }
  `;

  try {
    const result = await geminiModel.generateContent(followUpPrompt);
    const normalized = normalizeGeminiResponse(result.response.text());

    // If candidate said "stop", the text will contain END!!!
    if (normalized.text.includes("END!!!")) {
       return NextResponse.json({ question: normalized.text, imageUsed: false });
    }

    return NextResponse.json({
      question: normalized.text,
      imageUsed: normalized.action === "SHOW_IMAGE" && !!availableImage,
      imageLink: normalized.action === "SHOW_IMAGE" ? availableImage?.link : null,
      imageDescription: normalized.action === "SHOW_IMAGE" ? availableImage?.description : null,
    });
  } catch (error) {
    return NextResponse.json({ error: "Question generation failed." }, { status: 500 });
  }
}