import textToSpeech from "@google-cloud/text-to-speech";

const raw = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;

if (!raw) {
  throw new Error("Missing GOOGLE_APPLICATION_CREDENTIALS_JSON");
}

type GoogleCredentials = {
  client_email: string;
  private_key: string;
  project_id?: string;
};

type TtsRequestBody = {
  text: string;
  voiceName?: string;
  languageCode?: string;
};

const creds = JSON.parse(raw) as GoogleCredentials;

const projectId =
  process.env.GCP_PROJECT_ID || creds.project_id || process.env.GOOGLE_CLOUD_PROJECT;

if (!projectId) {
  throw new Error(
    "Missing GCP project id. Set GCP_PROJECT_ID, GOOGLE_CLOUD_PROJECT, or include project_id in GOOGLE_APPLICATION_CREDENTIALS_JSON"
  );
}

const ttsClient = new textToSpeech.TextToSpeechClient({
  credentials: {
    client_email: creds.client_email,
    private_key: creds.private_key.replace(/\\n/g, "\n"),
  },
  projectId,
});

export async function POST(req: Request) {
  const { text, voiceName, languageCode } = (await req.json()) as TtsRequestBody;

  const [response] = await ttsClient.synthesizeSpeech({
    input: { text },
    voice: {
      languageCode: languageCode || "en-GB",
      name: voiceName || "en-GB-Chirp3-HD-Leda",
    },
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
    },
  });
}
