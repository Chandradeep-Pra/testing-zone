import { NextRequest, NextResponse } from "next/server";

type SessionRequestBody = {
  avatarId?: string;
  voiceId?: string;
  contextId?: string;
  language?: string;
};

type LiveAvatarTokenResponse = {
  code: number;
  message: string;
  data?: {
    token: string;
    session_id?: string;
  };
};

type LiveAvatarStartResponse = {
  code: number;
  message: string;
  data?: {
    session_id: string;
    livekit_url: string;
    livekit_client_token: string;
    url?: string | null;
    access_token?: string | null;
    livekit_agent_token?: string | null;
    max_session_duration?: number;
    ws_url?: string | null;
  };
};

export async function POST(req: NextRequest) {
  const apiKey = process.env.LIVEAVATAR_API_KEY;
  const body = (await req.json().catch(() => ({}))) as SessionRequestBody;

  const avatarId = body.avatarId || process.env.LIVEAVATAR_AVATAR_ID;
  const voiceId = body.voiceId || process.env.LIVEAVATAR_VOICE_ID;
  const contextId = body.contextId || process.env.LIVEAVATAR_CONTEXT_ID;
  const language = body.language || process.env.LIVEAVATAR_LANGUAGE || "en";

  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing LIVEAVATAR_API_KEY" },
      { status: 500 }
    );
  }

  if (!avatarId || !voiceId || !contextId) {
    return NextResponse.json(
      {
        error:
          "Missing LiveAvatar configuration. Set LIVEAVATAR_AVATAR_ID, LIVEAVATAR_VOICE_ID, and LIVEAVATAR_CONTEXT_ID.",
      },
      { status: 400 }
    );
  }

  const tokenResponse = await fetch("https://api.liveavatar.com/v1/sessions/token", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-API-KEY": apiKey,
    },
    body: JSON.stringify({
      mode: "FULL",
      avatar_id: avatarId,
      avatar_persona: {
        voice_id: voiceId,
        context_id: contextId,
        language,
      },
    }),
    cache: "no-store",
  });

  const tokenPayload = (await tokenResponse.json()) as LiveAvatarTokenResponse;

  if (!tokenResponse.ok || !tokenPayload.data?.token) {
    return NextResponse.json(
      {
        error: tokenPayload.message || "Failed to create LiveAvatar session token",
        details: tokenPayload,
      },
      { status: tokenResponse.status || 500 }
    );
  }

  const sessionToken = tokenPayload.data.token;

  const startResponse = await fetch("https://api.liveavatar.com/v1/sessions/start", {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${sessionToken}`,
    },
    cache: "no-store",
  });

  const startPayload = (await startResponse.json()) as LiveAvatarStartResponse;

  if (!startResponse.ok || !startPayload.data) {
    return NextResponse.json(
      {
        error: startPayload.message || "Failed to start LiveAvatar session",
        details: startPayload,
      },
      { status: startResponse.status || 500 }
    );
  }

  const roomUrl = startPayload.data.livekit_url || startPayload.data.url || null;
  const clientToken =
    startPayload.data.livekit_client_token || startPayload.data.access_token || null;

  if (!roomUrl || !clientToken) {
    return NextResponse.json(
      {
        error: "LiveAvatar session started, but no client room credentials were returned.",
        details: startPayload,
      },
      { status: 502 }
    );
  }

  return NextResponse.json({
    sessionToken,
    ...startPayload.data,
    livekit_url: roomUrl,
    livekit_client_token: clientToken,
  });
}
