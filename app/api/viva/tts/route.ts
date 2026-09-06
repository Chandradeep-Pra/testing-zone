import textToSpeech from "@google-cloud/text-to-speech";
import { normalizeMedicalTerms, prepareTextForMedicalTts } from "@/lib/medical-terminology";
import { resolveVivaTtsVoice } from "@/lib/viva-tts-voice";

type GoogleCredentials = {
  client_email: string;
  private_key: string;
  project_id?: string;
};

type TtsRequestBody = {
  text: string;
  voiceName?: string;
  languageCode?: string;
  terminology?: unknown;
};

function createTtsClient() {
  const raw = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;

  if (!raw) {
    throw new Error("Missing GOOGLE_APPLICATION_CREDENTIALS_JSON");
  }

  const creds = JSON.parse(raw) as GoogleCredentials;

  const projectId =
    process.env.GCP_PROJECT_ID || creds.project_id || process.env.GOOGLE_CLOUD_PROJECT;

  if (!projectId) {
    throw new Error(
      "Missing GCP project id. Set GCP_PROJECT_ID, GOOGLE_CLOUD_PROJECT, or include project_id in GOOGLE_APPLICATION_CREDENTIALS_JSON"
    );
  }

  return new textToSpeech.TextToSpeechClient({
    credentials: {
      client_email: creds.client_email,
      private_key: creds.private_key.replace(/\\n/g, "\n"),
    },
    projectId,
  });
}

let cachedTtsClient: ReturnType<typeof createTtsClient> | null = null;

function getTtsClient() {
  cachedTtsClient ||= createTtsClient();
  return cachedTtsClient;
}

export async function POST(req: Request) {
  const { text, voiceName, languageCode, terminology } = (await req.json()) as TtsRequestBody;
  if (typeof text !== "string" || !text.trim()) {
    return Response.json({ error: "Text is required" }, { status: 400 });
  }
  let voice: ReturnType<typeof resolveVivaTtsVoice>;
  try {
    voice = resolveVivaTtsVoice(voiceName, languageCode);
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 400 });
  }
  const spokenText = prepareTextForMedicalTts(text, normalizeMedicalTerms(terminology));

  const [response] = await getTtsClient().synthesizeSpeech({
    input: { text: spokenText },
    voice,
    audioConfig: {
      audioEncoding: "MP3",
    },
  });

  const audioBody =
    response.audioContent instanceof Buffer
      ? response.audioContent
      : Buffer.from(response.audioContent as string | Uint8Array);

  return new Response(audioBody, {
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "no-store",
      "X-Viva-TTS-Voice": voice.name,
      "Access-Control-Expose-Headers": "X-Viva-TTS-Voice",
    },
  });
}
