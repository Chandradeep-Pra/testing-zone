import { VertexAI } from "@google-cloud/vertexai";


import fs from "fs";
import { parseEnv } from "node:util";

async function probeModels() {
  const envFile = fs.existsSync(".env.local") ? ".env.local" : ".env.prod.stud";
  const env = parseEnv(fs.readFileSync(envFile, "utf8"));
  
  const raw = env.GOOGLE_APPLICATION_CREDENTIALS_JSON || env.FIREBASE_PRIVATE_KEY_JSON;
  if (!raw) {
    console.error("Missing credentials");
    return;
  }

  const creds = JSON.parse(raw);
  const projectId = env.GCP_PROJECT_ID || creds.project_id;

  const vertexAI = new VertexAI({
    project: projectId,
    location: "asia-south1",
    googleAuthOptions: {
      credentials: {
        client_email: creds.client_email,
        private_key: creds.private_key.replace(/\\n/g, "\n"),
      },
    },
  });

  const testModels = [
    "gemini-1.5-pro-002",
    "gemini-1.5-flash-002",
    "gemini-2.0-flash-001",
    "gemini-2.0-flash-lite-preview-02-05",
    "gemini-2.0-pro-experimental-02-05",
    "gemini-2.0-pro-experimental",
    "gemini-1.5-pro",
    "gemini-1.5-flash",
    "gemini-3.6-flash",
    "gemini-3.5-flash-lite",

  ];

  console.log(`Checking model availability for project: ${projectId} in asia-south1...\n`);

  for (const modelName of testModels) {
    try {
      const model = vertexAI.getGenerativeModel({ model: modelName });
      // We do a very small prompt to see if the model is reachable
      await model.generateContent({
        contents: [{ role: "user", parts: [{ text: "ping" }] }],
        generationConfig: { maxOutputTokens: 1 }
      });
      console.log(`✅ ${modelName}: AVAILABLE`);
    } catch (error) {
      if (error.message.includes("404") || error.message.includes("not found")) {
        console.log(`❌ ${modelName}: NOT FOUND`);
      } else if (error.message.includes("403") || error.message.includes("permission")) {
        console.log(`🚫 ${modelName}: FORBIDDEN (No Permission)`);
      } else {
        console.log(`⚠️ ${modelName}: ERROR (${error.message.split('\n')[0]})`);
      }
    }
  }
}

probeModels();
