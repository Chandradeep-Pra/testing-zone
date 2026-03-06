// import { NextRequest, NextResponse } from "next/server";
// import { geminiModel } from "@/lib/gemni";
// import { vivaContext } from "@/ai-viva-data/vivaContext";

// function normalizeGeminiResponse(raw: any) {
//   if (!raw) {
//     return { type: "question", text: "Failed to generate a question.", action: null };
//   }

//   if (typeof raw === "string") {
//     try {
//       return JSON.parse(raw);
//     } catch {
//       return { type: "question", text: raw, action: null };
//     }
//   }

//   if (raw?.text && typeof raw.text === "string") {
//     try {
//       return JSON.parse(raw.text);
//     } catch {
//       return {
//         type: raw.type ?? "question",
//         text: raw.text,
//         action: raw.action ?? null,
//       };
//     }
//   }

//   if (raw?.type && raw?.text) return raw;

//   return { type: "question", text: "Failed to generate a question.", action: null };
// }

// // Define constants for the image details
// const IMAGE_DETAILS = [
//   {
//     link: "https://res.cloudinary.com/dvdt6jfo8/image/upload/v1770191268/PHOTO-2026-01-23-21-20-50_eqkazp.jpg",
//     description: "CT scan shows 3 cm polyploidal enhancing mass arising from the base of the bladder. Upper tracts are normal.",
//     available: true,
//   },
//   {
//     link: "https://res.cloudinary.com/dvdt6jfo8/image/upload/v1770195606/PHOTO-2025-12-11-18-24-41_bkmjxj.jpg",
//     description: "Cystoscopy shows papillary bladder tumor from the posterior wall of the bladder.",
//     available: true,
//   },
// ];

// // Define constants for the scoring parameters
// const SCORING_PARAMS = {
//   basic_knowledge: {
//     "4": [
//       "Poor basic knowledge",
//       "Lack of understanding to a level of concern",
//       "Failed in most/all competences"
//     ],
//     "5": [
//       "Gaps in knowledge",
//       "Demonstrated a lack of understanding",
//       "Failed in major competences"
//     ],
//     "6": [
//       "Competent knowledge",
//       "No major errors",
//       "Safe practice"
//     ],
//     "7": [
//       "Good basic knowledge",
//       "Comfortable with difficult problems",
//       "Provided some supporting evidence"
//     ],
//     "8": [
//       "Excellent basic knowledge",
//       "Knows the breadth and depth of the topic",
//       "Provided supporting evidence to a high level"
//     ]
//   },
//   higher_order_processing: {
//     "4": [
//       "No obvious higher order thinking",
//       "Incompetent clinical management",
//       "Lack of organisation",
//       "No logical thought",
//       "Lack of decision making",
//       "Unable to prioritise",
//       "Suggests course of action that would harm a volunteer",
//       "Unable to interpret data",
//       "Very poor responses despite prompting"
//     ],
//     "5": [
//       "Poor higher order thinking",
//       "Poor organisation",
//       "Poor clinical management",
//       "Limited logical thought",
//       "Limited decision making",
//       "Struggled to prioritise",
//       "Difficulty in interpreting data",
//       "Adequate responses which required significant prompting"
//     ],
//     "6": [
//       "Adequate higher order thinking",
//       "Adequate organisation",
//       "Adequate management",
//       "Adequate logical thought",
//       "Adequate decision making",
//       "Adequate prioritisation",
//       "Adequate data interpretation",
//       "Adequate responses with no or minimal prompting"
//     ],
//     "7": [
//       "Good higher order thinking",
//       "Good organisation",
//       "Good management",
//       "Good logical thought",
//       "Good decision making",
//       "Good prioritisation",
//       "Good data interpretation",
//       "Good responses without prompting"
//     ],
//     "8": [
//       "At ease with higher order thinking",
//       "Excellent organisation",
//       "Excellent logical thought",
//       "Excellent decision making",
//       "Excellent prioritisation",
//       "Excellent management",
//       "Excellent data interpretation",
//       "Excellent responses without prompting"
//     ]
//   },
//   clinical_skills: {
//     "4": [
//       "Incompetent clinical history taking",
//       "Incompetent clinical examination",
//       "Incompetent diagnostic skills"
//     ],
//     "5": [
//       "Poor clinical history taking",
//       "Poor clinical examination",
//       "Poor diagnostic skills"
//     ],
//     "6": [
//       "Competent clinical history taking",
//       "Competent clinical examination",
//       "Competent diagnostic skills"
//     ],
//     "7": [
//       "Good clinical history taking",
//       "Good clinical examination",
//       "Good diagnostic skills"
//     ],
//     "8": [
//       "Excellent clinical history taking",
//       "Excellent clinical examination",
//       "Excellent diagnostic skills"
//     ]
//   },
//   professionalism: {
//     "4": [
//       "Abrupt or rude",
//       "Inappropriate attitude or behaviour",
//       "No empathy",
//       "No rapport",
//       "Ignores verbal and non-verbal communication",
//       "Unaware of ethical issues"
//     ],
//     "5": [
//       "Unsympathetic",
//       "Limited or poor empathy",
//       "Inconsiderate",
//       "Poor rapport",
//       "Inappropriate response to verbal and non-verbal communication",
//       "Limited recognition of ethical issues"
//     ],
//     "6": [
//       "Shows respect",
//       "Shows empathy",
//       "Acceptable rapport",
//       "Considerate",
//       "Responds appropriately to verbal and non-verbal communication",
//       "Understands ethical issues"
//     ],
//     "7": [
//       "Good respect",
//       "Gains confidence quickly",
//       "Good empathy",
//       "Good rapport",
//       "Responds well to verbal and non-verbal communication",
//       "Good understanding of ethical issues"
//     ],
//     "8": [
//       "Excellent respect",
//       "Instils confidence",
//       "Excellent empathy",
//       "Excellent rapport",
//       "Excellent response to verbal and non-verbal communication",
//       "Excellent understanding of ethical issues"
//     ]
//   }
// };

// export async function POST(req: NextRequest) {
//   const { previousQA, exit } = await req.json();

//   console.log(previousQA);

//   if (!Array.isArray(previousQA)) {
//     return NextResponse.json({ error: "Invalid input." }, { status: 400 });
//   }

//   /* -------------------------------------------------
//      EXIT EVALUATION MODE - GENERATE SCORE
//   -------------------------------------------------- */
//   if (exit) {
//     const combinedQA = previousQA.map(({ question, answer }) => `Q: ${question}\nA: ${answer}`).join("\n\n");

//     const scoringGuide = JSON.stringify(SCORING_PARAMS, null, 2);

//     const prompt = `
// You are an FRCS examiner tasked with evaluating a candidate's responses across four dimensions: basic knowledge, higher order processing, clinical skills, and professionalism. Analyze all the provided questions and answers together and provide a single evaluation for each dimension. For each dimension, give a score (from 4 to 8) and a detailed reason for the score.

// Use the following scoring parameters as a guide for each dimension:
// ${scoringGuide}

// Questions and Answers:
// ${combinedQA}

// Provide the evaluation in the following format:
// {
//   "basic_knowledge": { "score": <score>, "reason": "<reason>" },
//   "higher_order_processing": { "score": <score>, "reason": "<reason>" },
//   "clinical_skills": { "score": <score>, "reason": "<reason>" },
//   "professionalism": { "score": <score>, "reason": "<reason>" }
// }
// `;

//     try {
//       const result = await geminiModel.generateContent(prompt);
//       const rawResponse = result.response.text();

//       // Attempt to sanitize and parse the response
//       const sanitizedResponse = rawResponse.replace(/```json|```/g, "").trim();
//       const evaluation = JSON.parse(sanitizedResponse);

//       return NextResponse.json({ evaluation });
//     } catch (error) {
//       console.error("Error analyzing responses with Gemini:", error);
//       return NextResponse.json({ error: "Failed to analyze responses. Ensure the Gemini response is valid JSON." }, { status: 500 });
//     }
//   }

//   /* -------------------------------------------------
//      🔑 FIRST QUESTION (DETERMINISTIC, NO GEMINI)
//   -------------------------------------------------- */
//   if (previousQA.length === 0) {
//     const firstQuestion = `${vivaContext.case.stem} How would you assess this patient initially?`;

//     return NextResponse.json({
//       question: firstQuestion,
//       imageUsed: false,
//       imageLink: null,
//       imageDescription: null,
//     });
//   }

//   /* -------------------------------------------------
//      FOLLOW-UPS (GEMINI-DRIVEN)
//   -------------------------------------------------- */
//   const availableImage = IMAGE_DETAILS.find((img) => img.available);

//   const prompt = `

// You are an FRCS viva examiner tasked with generating a single, concise question for the candidate. 
// Your task is to generate a follow up question like a viva examinee 

// This is the {pre}

// Previous QA: ${JSON.stringify(previousQA)}

// Use the following image if required:
// Image Link: ${availableImage ? availableImage.link : "No image available"}
// Image Description: ${availableImage ? availableImage.description : "No description available"}

// Write the question now without any greetings or additional context.
// If the candidate clearly asks to stop (e.g. "end the viva", "I want to stop", "finish"), 
// respond with a short closing statement and append EXACTLY:END!!!
// `;

//   if (availableImage) {
//     // mark image as used (mutates session copy)
//     availableImage.available = false;
//   }

//   try {
//     const result = await geminiModel.generateContent(prompt);

//     console.log("Prompt:", prompt);

//     console.log("Raw Gemini Response:", result.response.text());

//     const normalizedResponse = normalizeGeminiResponse(result.response.text());

//     return NextResponse.json({
//       question: normalizedResponse.text,
//       imageUsed: availableImage ? true : false,
//       imageLink: availableImage ? availableImage.link : null,
//       imageDescription: availableImage ? availableImage.description : null,
//     });
//   } catch (error) {
//     console.error("Error generating follow-up question:", error);
//     return NextResponse.json(
//       { error: "Failed to generate follow-up question." },
//       { status: 500 }
//     );
//   }
// }


// import { NextRequest, NextResponse } from "next/server";
// import { geminiModel } from "@/lib/gemni";
// import { vivaContext } from "@/ai-viva-data/vivaContext";

// function normalizeGeminiResponse(raw: any) {
//   if (!raw) {
//     return { type: "question", text: "Failed to generate a question.", action: null };
//   }
//   if (typeof raw === "string") {
//     try {
//       // Remove markdown code blocks if present
//       const cleaned = raw.replace(/```json|```/g, "").trim();
//       return JSON.parse(cleaned);
//     } catch {
//       return { type: "question", text: raw, action: null };
//     }
//   }
//   return raw;
// }

// // Image details remain as per your requirement
// const IMAGE_DETAILS = [
//   {
//     link: "https://res.cloudinary.com/dvdt6jfo8/image/upload/v1770381011/PHOTO-2026-02-05-21-52-58_trthtk.jpg",
//     description: "IPSS 22,  has bothersome nocturia , very poor flow ( Qmax- 3ml/sec) with a PVR of 160 cc . On Digital rectal examination-  a large 80 cc prostate is palpable . He also has a brother who had prostate cancer . How do want to proceed further ",
//     available: true,
//   },
//   {
//     link: "https://res.cloudinary.com/dvdt6jfo8/image/upload/v1770195606/PHOTO-2025-12-11-18-24-41_bkmjxj.jpg",
//     description: "Cystoscopy shows papillary bladder tumor from the posterior wall of the bladder.",
//     available: true,
//   },
// ];

// const SCORING_PARAMS = { /* ... (Keep your existing SCORING_PARAMS object here) ... */ };

// export async function POST(req: NextRequest) {
//   const { previousQA, exit } = await req.json();

//   if (!Array.isArray(previousQA)) {
//     return NextResponse.json({ error: "Invalid input." }, { status: 400 });
//   }

//   /* -------------------------------------------------
//      EXIT EVALUATION MODE
//   -------------------------------------------------- */
//   if (exit) {
//     const combinedQA = previousQA.map(({ question, answer }) => `Q: ${question}\nA: ${answer}`).join("\n\n");
    
//     const exitPrompt = `
//       You are a Senior FRCS Examiner. Evaluate the candidate's performance based on this specific case context:
//       ${JSON.stringify(vivaContext.case)}
      
//       MARKING GUIDELINES:
//       - Essential Points to cover: ${vivaContext.marking_criteria.must_mention.join(", ")}
//       - Critical Fails (Auto-fail if breached): ${vivaContext.marking_criteria.critical_fail.join(", ")}

//       SCORING RUBRIC:
//       ${JSON.stringify(SCORING_PARAMS)}

//       TRANSCRIPT:
//       ${combinedQA}

//       Provide a formal evaluation in JSON format:
//       {
//         "basic_knowledge": { "score": <4-8>, "reason": "<Detailed surgical justification>" },
//         "higher_order_processing": { "score": <4-8>, "reason": "<Ability to synthesize guidelines/data>" },
//         "clinical_skills": { "score": <4-8>, "reason": "<Diagnostic and management logic>" },
//         "professionalism": { "score": <4-8>, "reason": "<Communication style and safety awareness>" }
//       }
//     `;

//     try {
//       const result = await geminiModel.generateContent(exitPrompt);
//       const evaluation = JSON.parse(result.response.text().replace(/```json|```/g, "").trim());
//       return NextResponse.json({ evaluation });
//     } catch (error) {
//       return NextResponse.json({ error: "Evaluation failed." }, { status: 500 });
//     }
//   }

//   /* -------------------------------------------------
//      🔑 FIRST QUESTION
//   -------------------------------------------------- */
//   if (previousQA.length === 0) {
//     const firstQuestion = `${vivaContext.case.stem}`;

//     return NextResponse.json({
//       question: `${vivaContext.case.stem} How would you assess this patient in the clinic?`,
//       imageUsed: false,
//       imageLink: null,
//     });
//   }

//   /* -------------------------------------------------
//      FOLLOW-UPS (FRCS GRADE)
//   -------------------------------------------------- */
//   const availableImage = IMAGE_DETAILS.find((img) => img.available);

//   const followUpPrompt = `
//     ROLE: You are a strict, formal FRCS (Urol) Examiner. No small talk. No feedback like "Correct" or "Good."
    
//     CASE CONTEXT:
//     - Stem: ${vivaContext.case.stem}
//     - Objectives: ${vivaContext.case.objectives.join(", ")}
//     - Ground Truth (Imaging): ${vivaContext.exhibits.map(e => e.description).join(" | ")}
//     - Safety/Critical Fails: ${vivaContext.marking_criteria.critical_fail.join(", ")}

//     CANDIDATE HISTORY:
//     ${JSON.stringify(previousQA)}

//     TASK:
//     1. Assess the candidate's last answer. If it's shallow, "drill down" into technical specifics (e.g., TNM staging, specific surgical steps, or guideline-based rationale).
//     2. Follow the "Viva Ladder": Start with diagnosis -> investigations -> management -> handling complications.
//     3. If the candidate mentions an investigation (e.g., CT or Cystoscopy) and it is available in the exhibits, provide the image.
//     4. Keep questions high-level (FRCS Exit Exam standard). Focus on clinical safety and evidence-based practice (BAUS/NICE).
//     5. Ask exactly ONE question. 

//     If the candidate asks to stop or the maximum of 10 questions is reached, say "The viva is concluded. Thank you." and append EXACTLY: END!!!

//     RESPONSE FORMAT (JSON ONLY):
//     {
//       "type": "question",
//       "text": "Your crisp surgical question here",
//       "action": "SHOW_IMAGE or null"
//     }
//   `;

//   try {
//     const result = await geminiModel.generateContent(followUpPrompt);
//     const normalized = normalizeGeminiResponse(result.response.text());

//     // If candidate said "stop", the text will contain END!!!
//     if (normalized.text.includes("END!!!")) {
//        return NextResponse.json({ question: normalized.text, imageUsed: false });
//     }

//     return NextResponse.json({
//       question: normalized.text,
//       imageUsed: normalized.action === "SHOW_IMAGE" && !!availableImage,
//       imageLink: normalized.action === "SHOW_IMAGE" ? availableImage?.link : null,
//       imageDescription: normalized.action === "SHOW_IMAGE" ? availableImage?.description : null,
//     });
//   } catch (error) {
//     return NextResponse.json({ error: "Question generation failed." }, { status: 500 });
//   }
// }

import { NextRequest, NextResponse } from "next/server";
import { geminiModel } from "@/lib/gemni";
import { vivaContext } from "@/ai-viva-data/vivaContext";

/* -------------------------------------------------
   Helpers
-------------------------------------------------- */

function normalizeGeminiResponse(raw: any) {
  try {
    if (!raw) {
      return {
        type: "question",
        text: "Could you elaborate further?",
        action: null,
      };
    }

    if (typeof raw === "string") {
      const cleaned = raw.replace(/```json|```/g, "").trim();

      try {
        return JSON.parse(cleaned);
      } catch {
        return { type: "question", text: cleaned, action: null };
      }
    }

    return raw;
  } catch {
    return {
      type: "question",
      text: "Could you clarify your answer?",
      action: null,
    };
  }
}

function resolveImage(file?: string) {
  if (!file) return null;

  if (file.startsWith("http")) return file;

  return `/exhibits/${file}`;
}

function getRelevantImage() {
  if (!vivaContext?.exhibits) return null;

  return vivaContext.exhibits.find((e) => e.kind === "image");
}

/* -------------------------------------------------
   API
-------------------------------------------------- */

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const previousQA = body.previousQA || [];
    const topic = body.topic || "history";
    const exit = body.exit || false;

    if (!Array.isArray(previousQA)) {
      return NextResponse.json({ error: "Invalid input." }, { status: 400 });
    }

    /* -------------------------------------------------
       EXIT EVALUATION
    -------------------------------------------------- */

    if (exit) {
      const transcript = previousQA
        .map((qa: any) => `Q: ${qa.question}\nA: ${qa.answer}`)
        .join("\n\n");

      const evaluationPrompt = `
You are a Senior FRCS (Urol) Examiner evaluating a candidate after a viva examination.

CASE
${vivaContext?.case?.stem || ""}

MARKING CRITERIA

Essential Points the candidate should mention:
${vivaContext?.marking_criteria?.must_mention?.join(", ")}

Critical Failures (automatic fail if committed):
${vivaContext?.marking_criteria?.critical_fail?.join(", ")}

TRANSCRIPT OF THE VIVA
${transcript}

TASK

Provide a structured assessment of the candidate's performance.

Scoring scale:
4 = unsafe / poor
5 = borderline
6 = acceptable
7 = good
8 = excellent

Evaluate the candidate in the following domains:

1. Basic Knowledge
2. Higher Order Processing
3. Clinical Skills
4. Professionalism

For each domain:
- give a score (4–8)
- explain the reasoning
- provide a short summary

Also provide:

- overall strengths demonstrated during the viva
- key weaknesses or omissions
- a short improvement plan for the candidate

IMPORTANT RULES

- Base the evaluation ONLY on the transcript.
- Refer to the case context and marking criteria.
- Be constructive and specific.
- Do NOT provide teaching paragraphs.
- Keep feedback concise and professional.

Return STRICT JSON in the following format:

{
  "basic_knowledge": {
    "score": 4-8,
    "summary": "Short summary of performance",
    "reason": "Detailed explanation referencing the transcript"
  },
  "higher_order_processing": {
    "score": 4-8,
    "summary": "Short summary",
    "reason": "Detailed explanation"
  },
  "clinical_skills": {
    "score": 4-8,
    "summary": "Short summary",
    "reason": "Detailed explanation"
  },
  "professionalism": {
    "score": 4-8,
    "summary": "Short summary",
    "reason": "Detailed explanation"
  },
  "strengthsOverall": [
    "Key strength 1",
    "Key strength 2"
  ],
  "weaknessesOverall": [
    "Key weakness 1",
    "Key weakness 2"
  ],
  "improvementPlan": [
    "Specific improvement recommendation 1",
    "Specific improvement recommendation 2"
  ]
}
`;

      try {
        const result = await geminiModel.generateContent(evaluationPrompt);

        const raw = result?.response?.text?.() ?? "";

        const cleaned = raw.replace(/```json|```/g, "").trim();

        let evaluation;

        try {
          evaluation = JSON.parse(cleaned);
        } catch {
          evaluation = {
            basic_knowledge: { score: 5, reason: "Partial knowledge demonstrated." },
            higher_order_processing: { score: 5, reason: "Moderate reasoning ability." },
            clinical_skills: { score: 5, reason: "Basic clinical logic." },
            professionalism: { score: 6, reason: "Appropriate professional conduct." },
          };
        }

        return NextResponse.json({ evaluation });
      } catch (err) {
        console.error("Evaluation error:", err);

        return NextResponse.json(
          { error: "Evaluation failed." },
          { status: 500 }
        );
      }
    }

    /* -------------------------------------------------
       FIRST QUESTION
    -------------------------------------------------- */

    if (previousQA.length === 0) {
      return NextResponse.json({
        question: `${vivaContext?.case?.stem} How would you assess this patient in the clinic?`,
        imageUsed: false,
        imageLink: null,
      });
    }

    /* -------------------------------------------------
       FOLLOW UP QUESTION
    -------------------------------------------------- */

   const followUpPrompt = `
ROLE
You are a strict FRCS (Urol) examiner conducting an oral viva examination.

TONE
Formal, neutral, concise. Speak like a UK consultant examiner.

BEHAVIOUR RULES
- Ask EXACTLY ONE question.
- Do NOT give hints.
- Do NOT explain answers.
- Do NOT confirm whether the candidate is correct.
- Do NOT reveal the correct diagnosis, investigation findings, or management.
- Do NOT include teaching statements.
- Do NOT ask multiple questions in one response.

PROFESSIONAL CONDUCT
If the candidate uses abusive or inappropriate language, respond ONLY with:
"Please maintain professional conduct during the examination."
Then continue the viva with the next appropriate question.

CASE CONTEXT
${vivaContext.case.stem}

CURRENT VIVA TOPIC
${topic}

OBJECTIVES
${vivaContext.case.objectives.join(", ")}

CANDIDATE HISTORY
${JSON.stringify(previousQA)}

QUESTION STYLE GUIDE

history  
→ ask about symptoms, risk factors, or red flags

investigations  
→ ask which investigations should be performed

interpretation  
→ ask the candidate to interpret imaging or findings

management  
→ ask about treatment strategy or operative planning

complications  
→ ask about surgical or postoperative complications

EXHIBITS (Hidden Examiner Notes — DO NOT reveal directly)
${vivaContext.exhibits
  .map(e => `${e.label}: ${e.description}`)
  .join("\n")}

Rules for exhibits:
- These descriptions are hidden examiner notes.
- The candidate cannot see them.
- NEVER reveal the findings directly.
- If the candidate requests or mentions an investigation that corresponds to an exhibit,
  set action = "SHOW_IMAGE".
- When an exhibit is shown, ask the candidate to interpret it.

IMPORTANT
Never reveal the correct answer or imaging findings inside the question.

RESPONSE FORMAT (JSON ONLY)

{
"type": "question",
"text": "Examiner question",
"action": "SHOW_IMAGE or null"
}
`;

    try {
      const result = await geminiModel.generateContent(followUpPrompt);

      const raw = result?.response?.text?.() ?? "";

      const normalized = normalizeGeminiResponse(raw);

      const image =
        normalized?.action === "SHOW_IMAGE"
          ? getRelevantImage()
          : null;

      return NextResponse.json({
        question:
          normalized?.text ||
          "Could you elaborate further on your answer?",

        imageUsed: !!image,

        imageLink: image ? resolveImage(image.file) : null,

        imageDescription: image?.description ?? null,
      });
    } catch (err) {
      console.error("Followup generation error:", err);

      return NextResponse.json(
        { error: "Question generation failed." },
        { status: 500 }
      );
    }
  } catch (err) {
    console.error("API error:", err);

    return NextResponse.json(
      { error: "Server error." },
      { status: 500 }
    );
  }
}