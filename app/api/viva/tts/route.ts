import { VertexAI } from "@google-cloud/vertexai";
import textToSpeech from "@google-cloud/text-to-speech";

const raw = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
if (!raw) {
  throw new Error("Missing GOOGLE_APPLICATION_CREDENTIALS_JSON");
}

const creds = JSON.parse(raw);

const projectId =
  process.env.GCP_PROJECT_ID || creds.project_id || process.env.GOOGLE_CLOUD_PROJECT;
if (!projectId) {
  throw new Error(
    "Missing GCP project id. Set GCP_PROJECT_ID, GOOGLE_CLOUD_PROJECT, or include project_id in GOOGLE_APPLICATION_CREDENTIALS_JSON"
  );
}

const vertexAI = new VertexAI({
  project: projectId,
  location: "us-central1",
  credentials: {
    client_email: creds.client_email,
    private_key: creds.private_key.replace(/\\n/g, "\n"),
  },
});

const model = vertexAI.getGenerativeModel({ model: "gemini-2.5-flash" });

const ttsClient = new textToSpeech.TextToSpeechClient({
  credentials: {
    client_email: creds.client_email,
    private_key: creds.private_key.replace(/\\n/g, "\n"),
  },
  projectId,
});

export async function generateFollowup(req: Request) {
  const { text } = await req.json();

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text }] }],
  });

  const generatedText = result.response.candidates[0].content.parts[0].text;

  return new Response(JSON.stringify({ generatedText }), {
    headers: {
      "Content-Type": "application/json",
    },
  });
}

export async function POST(req: Request) {
  const { text } = await req.json();

  const [response] = await ttsClient.synthesizeSpeech({
    input: { text },
    voice: {
      languageCode: "en-GB",
      name: "en-GB-Neural2-B",
    },
    audioConfig: {
      audioEncoding: "MP3",
    },
  });

  return new Response(response.audioContent, {
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "no-store",
    },
  });
}