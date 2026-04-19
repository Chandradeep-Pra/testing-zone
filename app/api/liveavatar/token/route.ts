import { NextResponse } from "next/server";

export async function POST() {
  try {
    const response = await fetch("https://api.liveavatar.com/v1/sessions/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": process.env.LIVEAVATAR_API_KEY as string,
      },
      body: JSON.stringify({
        // avatar_id: "fc9c1f9f-bc99-4fd9-a6b2-8b4b5669a046",
        avatar_id: "7022c7cdd04f4d3b8c97b01215dab653",
        avatar_persona: {
          // voice_id: "254ffe1e-c89f-430f-8c36-9e7611d310c0",
          voice_id: "df9fc5e1bcf64f5e9faf0adb52cdade5",
          context_id: "129f10bb-3e04-4aa6-8ff7-5d396f312e62",
          language: "en",
          voice_settings: {
            provider: "elevenLabs",
            speed: 1,
            stability: 0.75,
            similarity_boost: 0.75,
            style: 0,
            use_speaker_boost: true,
            model: "eleven_flash_v2_5",
          },
          stt_config: {
            provider: "deepgram",
          },
        },
        mode: "FULL",
        is_sandbox: false,
        video_settings: {
          quality: "high",
          encoding: "H264",
        },
        max_session_duration: 123,
        // interactivity_type: "CONVERSATIONAL",
        interactivity_type: "PUSH_TO_TALK",
      }),
    });

    const data = await response.json();

    console.log("LIVEAVATAR TOKEN RESPONSE:", data);

    if (!response.ok) {
      return NextResponse.json({ error: data }, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("LiveAvatar Token Error:", error);
    return NextResponse.json(
      { error: "Failed to create session token" },
      { status: 500 }
    );
  }
}