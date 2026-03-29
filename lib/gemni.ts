import { VertexAI } from "@google-cloud/vertexai";

const raw = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
if (!raw) {
  throw new Error("Missing GOOGLE_APPLICATION_CREDENTIALS_JSON");
}

const creds = JSON.parse(raw);

const projectId = process.env.GCP_PROJECT_ID || creds.project_id || process.env.GOOGLE_CLOUD_PROJECT;
if (!projectId) {
  throw new Error(
    "Missing GCP project id. Set GCP_PROJECT_ID, GOOGLE_CLOUD_PROJECT, or include project_id in GOOGLE_APPLICATION_CREDENTIALS_JSON"
  );
}

const vertexAI = new VertexAI({
  project: projectId,
  location: "us-central1",
  googleAuthOptions: {
    credentials: {
      client_email: creds.client_email,
      private_key: creds.private_key.replace(/\\n/g, "\n"),
    },
  },
});

export const geminiModel = vertexAI.getGenerativeModel({ model: "gemini-2.5-pro" });
