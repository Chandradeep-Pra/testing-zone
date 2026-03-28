import { NextRequest, NextResponse } from 'next/server';
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';

const elevenlabs = new ElevenLabsClient({
  apiKey: process.env.ELEVENLABS_API_KEY,
});

export async function GET(req: NextRequest) {
  try {
    const token = await elevenlabs.tokens.singleUse.create('realtime_scribe');
    return NextResponse.json(token);
  } catch (error) {
    return NextResponse.json({ error: error?.message || 'Token error' }, { status: 500 });
  }
}
