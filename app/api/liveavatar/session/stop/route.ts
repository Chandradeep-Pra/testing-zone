import { NextRequest, NextResponse } from "next/server";

type StopSessionRequestBody = {
  sessionToken?: string;
};

export async function POST(req: NextRequest) {
  const { sessionToken } = (await req.json().catch(() => ({}))) as StopSessionRequestBody;

  if (!sessionToken) {
    return NextResponse.json({ error: "Missing sessionToken" }, { status: 400 });
  }

  const stopResponse = await fetch("https://api.liveavatar.com/v1/sessions/stop", {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${sessionToken}`,
    },
    cache: "no-store",
  });

  const payload = await stopResponse.json().catch(() => null);

  if (!stopResponse.ok) {
    return NextResponse.json(
      { error: "Failed to stop LiveAvatar session", details: payload },
      { status: stopResponse.status || 500 }
    );
  }

  return NextResponse.json({ success: true, details: payload });
}
