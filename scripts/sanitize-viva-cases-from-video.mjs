// import { VertexAI } from "@google-cloud/vertexai";
// import fs from "fs";
// import path from "path";
// import { parseEnv } from "node:util";

// async function sanitizeAndExtractCases() {
//   const envFile = fs.existsSync(".env.local") ? ".env.local" : ".env.prod.stud";
//   const env = parseEnv(fs.readFileSync(envFile, "utf8"));

//   const videoGcsUri = "gs://urology-premium/videos/frcs-section-2-urology/y2shdoMe1UARBExjNaMU/1779895033587-session-1-uro-oncology-1-bladder-rcc-utuc.mp4";
//   const selectedModel = "gemini-2.5-flash";

//   const raw = env.GOOGLE_APPLICATION_CREDENTIALS_JSON || env.FIREBASE_PRIVATE_KEY_JSON;
//   if (!raw) {
//     console.error("❌ Missing credentials in env file");
//     return;
//   }

//   const creds = JSON.parse(raw);

//   const vertexAI = new VertexAI({
//     project: env.GCP_PROJECT_ID || creds.project_id,
//     location: "us-central1",
//     apiEndpoint: "us-central1-aiplatform.googleapis.com",
//     googleAuthOptions: {
//       credentials: {
//         client_email: creds.client_email,
//         private_key: creds.private_key.replace(/\\n/g, "\n"),
//       },
//       scopes: ["https://www.googleapis.com/auth/cloud-platform"],
//     },
//   });

//   const model = vertexAI.getGenerativeModel({
//     model: selectedModel,
//     generationConfig: {
//       maxOutputTokens: 8192,
//       responseMimeType: "application/json",
//     },
//   });

//   // STEP 1: PRE-FLIGHT CHECK (Model Availability & GCS Access)
//   console.log("--------------------------------------------------");
//   console.log(`📡 [Check 1/2] Verifying model availability: ${selectedModel}`);
//   console.log(`📁 [Check 2/2] Verifying GCS video accessibility: ${videoGcsUri}`);

//   try {
//     const healthCheck = await model.generateContent({
//       contents: [
//         {
//           role: "user",
//           parts: [
//             { fileData: { mimeType: "video/mp4", fileUri: videoGcsUri } },
//             { text: "System check: Return the single word READY if you can process this video." },
//           ],
//         },
//       ],
//     });

//     const checkText = healthCheck.response.candidates?.[0]?.content?.parts?.[0]?.text || "";
//     if (checkText.trim().toUpperCase().includes("READY")) {
//       console.log("✅ Model status: ONLINE");
//       console.log("✅ Video access: ACCESSIBLE");
//     } else {
//       console.log("🟢 Pre-flight check completed, initiating full stream...");
//     }
//   } catch (checkErr) {
//     console.error("❌ Pre-flight check failed!");
//     console.error("Reason:", checkErr.message);
//     return;
//   }

//   console.log("--------------------------------------------------");
//   console.log("🚀 Starting multimodal extraction stream...");
//   console.log("Video URI:", videoGcsUri);
//   console.log("Model:", selectedModel);

//   const prompt = `
//     Analyze this medical viva session video. It contains multiple cases discussed by a teacher and students.

//     TASK:
//     1. EXTRACT PERSONA: Analyze the teacher's (interviewer) personality, tone, and questioning style. 
//        - Are they encouraging? Strict? Do they use specific clinical turns of phrase?
//        - Create a detailed 'Examiner Personality Profile'.

//     2. SPLIT CASES: Identify every distinct clinical case discussed.
//        - Provide start and end timestamps for each case.

//     3. SANITIZE & STRUCTURE: For each case, provide:
//        - title: A short title.
//        - stem: The clinical opening.
//        - objectives: What the candidate is being tested on.
//        - hiddenFacts: Clinical data revealed only during questioning.
//        - markingCriteria: Points for passing or failing.
//        - exhibits: Descriptions of any scans/images shown on screen.

//     4. SANITIZATION RULE: Remove all personal names of students, hospitals, or specific locations. Refer to the candidate as "Candidate" and the examiner as "Examiner".

//     Return the output as a valid JSON object matching this structure:
//     {
//       "persona": {
//         "name": "The Teacher's Style",
//         "description": "...",
//         "keyPhrases": ["...", "..."],
//         "systemInstruction": "A prompt snippet to make an AI behave exactly like this teacher"
//       },
//       "cases": [
//         { "title": "...", "startTime": "...", "endTime": "...", "stem": "...", "objectives": [], "hiddenFacts": [], "markingCriteria": {}, "exhibits": [] }
//       ]
//     }
//   `;

//   try {
//     const streamingResult = await model.generateContentStream({
//       contents: [
//         {
//           role: "user",
//           parts: [
//             {
//               fileData: {
//                 mimeType: "video/mp4",
//                 fileUri: videoGcsUri,
//               },
//             },
//             { text: prompt },
//           ],
//         },
//       ],
//     });

//     let fullText = "";
//     for await (const item of streamingResult.stream) {
//       const chunkText = item.candidates?.[0]?.content?.parts?.[0]?.text || "";
//       if (chunkText) {
//         fullText += chunkText;
//         process.stdout.write(".");
//       }
//     }
//     process.stdout.write("\n");

//     const outputDir = "./ai-viva-data/extracted";
//     if (!fs.existsSync(outputDir)) {
//       fs.mkdirSync(outputDir, { recursive: true });
//     }

//     fs.writeFileSync(path.join(outputDir, "sanitized-cases.json"), fullText, "utf8");
//     console.log("✅ Successfully extracted and sanitized cases to ai-viva-data/extracted/sanitized-cases.json");

//   } catch (error) {
//     console.error("❌ Error during stream processing:", error);
//   }
// }

// sanitizeAndExtractCases();

import { VertexAI } from "@google-cloud/vertexai";
import fs from "fs";
import path from "path";
import { parseEnv } from "node:util";

async function sanitizeAndExtractCases() {
  const envFile = fs.existsSync(".env.local") ? ".env.local" : ".env.prod.stud";
  const env = parseEnv(fs.readFileSync(envFile, "utf8"));

  const videoGcsUri = "gs://urology-premium/videos/frcs-section-2-urology/y2shdoMe1UARBExjNaMU/1779895033587-session-1-uro-oncology-1-bladder-rcc-utuc.mp4";
  
  // Exact Vertex AI model identifier (requires version suffix)
  const selectedModel = "gemini-2.5-flash";

  const raw = env.GOOGLE_APPLICATION_CREDENTIALS_JSON || env.FIREBASE_PRIVATE_KEY_JSON;
  if (!raw) {
    console.error("❌ Missing credentials in env file");
    return;
  }

  const creds = JSON.parse(raw);

  const vertexAI = new VertexAI({
    project: env.GCP_PROJECT_ID || creds.project_id,
    location: "us-central1",
    apiEndpoint: "us-central1-aiplatform.googleapis.com",
    googleAuthOptions: {
      credentials: {
        client_email: creds.client_email,
        private_key: creds.private_key.replace(/\\n/g, "\n"),
      },
      scopes: ["https://www.googleapis.com/auth/cloud-platform"],
    },
  });

  const model = vertexAI.getGenerativeModel({
    model: selectedModel,
    generationConfig: {
      maxOutputTokens: 8192,
      responseMimeType: "application/json",
    },
  });

  console.log("--------------------------------------------------");
  console.log("🚀 Starting extraction directly with streaming...");
  console.log("Video URI:", videoGcsUri);
  console.log("Model:", selectedModel);
  console.log("⏳ Processing 1-hour video... (Expect 2-4 minutes before first token)");

  const startTime = Date.now();
  const timer = setInterval(() => {
    const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
    process.stdout.write(`\r⏳ Elapsed time: ${elapsedSeconds}s processing video...`);
  }, 5000);

  const prompt = `
    Analyze this medical viva session video. It contains multiple cases discussed by a teacher and students.

    TASK:
    1. EXTRACT PERSONA: Analyze the teacher's (interviewer) personality, tone, and questioning style. 
       - Are they encouraging? Strict? Do they use specific clinical turns of phrase?
       - Create a detailed 'Examiner Personality Profile'.

    2. SPLIT CASES: Identify every distinct clinical case discussed.
       - Provide start and end timestamps for each case.

    3. SANITIZE & STRUCTURE: For each case, provide:
       - title: A short title.
       - stem: The clinical opening.
       - objectives: What the candidate is being tested on.
       - hiddenFacts: Clinical data revealed only during questioning.
       - markingCriteria: Points for passing or failing.
       - exhibits: Descriptions of any scans/images shown on screen.

    4. SANITIZATION RULE: Remove all personal names of students, hospitals, or specific locations. Refer to the candidate as "Candidate" and the examiner as "Examiner".

    Return the output as a valid JSON object matching this structure:
    {
      "persona": {
        "name": "The Teacher's Style",
        "description": "...",
        "keyPhrases": ["...", "..."],
        "systemInstruction": "A prompt snippet to make an AI behave exactly like this teacher"
      },
      "cases": [
        { "title": "...", "startTime": "...", "endTime": "...", "stem": "...", "objectives": [], "hiddenFacts": [], "markingCriteria": {}, "exhibits": [] }
      ]
    }
  `;

  try {
    const streamingResult = await model.generateContentStream({
      contents: [
        {
          role: "user",
          parts: [
            {
              fileData: {
                mimeType: "video/mp4",
                fileUri: videoGcsUri,
              },
            },
            { text: prompt },
          ],
        },
      ],
    });

    let fullText = "";
    let firstChunkReceived = false;

    for await (const item of streamingResult.stream) {
      if (!firstChunkReceived) {
        clearInterval(timer);
        process.stdout.write("\n✅ Stream connected! Receiving response tokens...\n");
        firstChunkReceived = true;
      }

      const chunkText = item.candidates?.[0]?.content?.parts?.[0]?.text || "";
      if (chunkText) {
        fullText += chunkText;
        process.stdout.write(".");
      }
    }
    process.stdout.write("\n");

    const outputDir = "./ai-viva-data/extracted";
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(path.join(outputDir, "sanitized-cases.json"), fullText, "utf8");
    console.log(`✅ Successfully extracted cases in ${Math.floor((Date.now() - startTime) / 1000)}s!`);
    console.log("Saved to: ./ai-viva-data/extracted/sanitized-cases.json");

  } catch (error) {
    clearInterval(timer);
    console.error("\n❌ Error during stream processing:", error);
  }
}

sanitizeAndExtractCases();