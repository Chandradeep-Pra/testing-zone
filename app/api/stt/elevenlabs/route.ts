import { NextRequest, NextResponse } from 'next/server';

// This route will accept audio data (WAV/PCM) and forward it to ElevenLabs STT API
// You must set ELEVENLABS_API_KEY in your environment variables

export async function POST(req: NextRequest) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Missing ElevenLabs API key' }, { status: 500 });
  }

  // Accept audio as binary
  const audioBuffer = await req.arrayBuffer();

  // Forward to ElevenLabs STT API
  const response = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'audio/wav', // or 'audio/pcm' depending on your frontend
    },
    body: audioBuffer,
  });

  if (!response.ok) {
    const error = await response.text();
    return NextResponse.json({ error }, { status: response.status });
  }

  const data = await response.json();
  return NextResponse.json(data);
}
