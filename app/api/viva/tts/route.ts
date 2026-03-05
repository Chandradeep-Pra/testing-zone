//@ts-nocheck

import { TextToSpeechClient } from "@google-cloud/text-to-speech";

const client = new TextToSpeechClient();

export async function POST(req: Request) {
  const { text } = await req.json();

  const [response] = await client.synthesizeSpeech({
    input: { text },

    voice: {
      languageCode: "en-US",
      name: "en-US-Chirp3-HD-Charon",
    },

    audioConfig: {
  audioEncoding: "LINEAR16",
  sampleRateHertz: 24000
}
  });

  return new Response(response.audioContent as Uint8Array, {
    headers: {
      "Content-Type": "audio/wav",
    },
  });
}