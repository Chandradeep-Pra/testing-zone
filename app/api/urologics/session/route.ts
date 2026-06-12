import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "urologics_id_token";

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { idToken?: unknown };
  const idToken = typeof body.idToken === "string" ? body.idToken.trim() : "";

  if (!idToken) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set(COOKIE_NAME, idToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 55,
  });

  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.set(COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });

  return response;
}
