export const runtime = "nodejs";

import { geminiTtsClient } from "@/lib/gemni-tts";
import { NextRequest } from "next/server";

/* ---------- WAV helpers ---------- */

function parseMimeType(mimeType: string) {
  const [fileType, ...params] = mimeType.split(";").map(s => s.trim());
  const [, format] = fileType.split("/");

  let sampleRate = 24000;
  let bitsPerSample = 16;

  for (const p of params) {
    const [k, v] = p.split("=");
    if (k === "rate") sampleRate = parseInt(v, 10);
  }

  return { sampleRate, bitsPerSample };
}

function createWavHeader(
  dataLength: number,
  sampleRate: number,
  bitsPerSample: number
) {
  const numChannels = 1;
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;

  const buffer = Buffer.alloc(44);
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataLength, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataLength, 40);

  return buffer;
}

/* ---------- API ---------- */

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();
    if (!text) return new Response("No text", { status: 400 });

    const response = await geminiTtsClient.models.generateContent({
      model: "gemini-2.5-pro-preview-tts",
      config: {
        responseModalities: ["audio"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: "Zephyr" }
          }
        }
      },
      contents: [{ role: "user", parts: [{ text }] }]
    });

    const part =
      response.candidates?.[0]?.content?.parts?.[0]?.inlineData;

    if (!part?.data || !part.mimeType) {
      console.error("❌ Gemini returned no audio");
      return new Response("No audio", { status: 500 });
    }

    const raw = Buffer.from(part.data, "base64");
    const { sampleRate, bitsPerSample } = parseMimeType(part.mimeType);
    const header = createWavHeader(raw.length, sampleRate, bitsPerSample);
    const wav = Buffer.concat([header, raw]);

    return new Response(wav, {
      headers: {
        "Content-Type": "audio/wav",
        "Cache-Control": "no-store"
      }
    });
  } catch (err) {
    console.error("❌ TTS ERROR:", err);
    return new Response("TTS failed", { status: 500 });
  }
}
