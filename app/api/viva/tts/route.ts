//@ts-nocheck

// import { TextToSpeechClient } from "@google-cloud/text-to-speech";

// const client = new TextToSpeechClient();

// export async function POST(req: Request) {
//   const { text } = await req.json();

//   const [response] = await client.synthesizeSpeech({
//     input: { text },

//     voice: {
//       languageCode: "en-US",
//       name: "en-US-Chirp3-HD-Charon",
//     },

//     audioConfig: {
//   audioEncoding: "LINEAR16",
//   sampleRateHertz: 24000
// }
//   });

//   return new Response(response.audioContent as Uint8Array, {
//     headers: {
//       "Content-Type": "audio/wav",
//     },
//   });
// }

import textToSpeech from "@google-cloud/text-to-speech";

const raw = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;

if (!raw) {
  throw new Error("Missing GOOGLE_APPLICATION_CREDENTIALS_JSON");
}

const creds = JSON.parse(raw);

const client = new textToSpeech.TextToSpeechClient({
  credentials: {
    client_email: creds.client_email,
    private_key: creds.private_key.replace(/\\n/g, "\n"),
  },
  projectId: creds.project_id,
});

export async function POST(req) {
  const { text } = await req.json();

  const [response] = await client.synthesizeSpeech({
    input: { text },
    voice: {
      languageCode: "en-US",
      name: "en-US-Chirp3-HD-Charon",
    },
    audioConfig: {
      audioEncoding: "MP3",
    },
  });

  return new Response(response.audioContent, {
    headers: {
      "Content-Type": "audio/mpeg",
    },
  });
}