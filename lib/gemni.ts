import { VertexAI } from "@google-cloud/vertexai";

function createGeminiModel() {
  const raw = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
  if (!raw) {
    throw new Error("Missing GOOGLE_APPLICATION_CREDENTIALS_JSON");
  }

  const creds = JSON.parse(raw) as {
    client_email?: string;
    private_key?: string;
    project_id?: string;
  };

  const projectId =
    process.env.GCP_PROJECT_ID || creds.project_id || process.env.GOOGLE_CLOUD_PROJECT;
  if (!projectId) {
    throw new Error(
      "Missing GCP project id. Set GCP_PROJECT_ID, GOOGLE_CLOUD_PROJECT, or include project_id in GOOGLE_APPLICATION_CREDENTIALS_JSON"
    );
  }

  if (!creds.client_email || !creds.private_key) {
    throw new Error("Missing Google service account client_email or private_key");
  }

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

  return vertexAI.getGenerativeModel({ model: "gemini-2.5-flash" });
}

let cachedGeminiModel: ReturnType<typeof createGeminiModel> | null = null;

function getGeminiModel() {
  cachedGeminiModel ||= createGeminiModel();
  return cachedGeminiModel;
}

export const geminiModel = {
  generateContent(...args: Parameters<ReturnType<typeof createGeminiModel>["generateContent"]>) {
    return getGeminiModel().generateContent(...args);
  },
};
