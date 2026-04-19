import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    // optionally accept token from frontend
    const { token } = await req.json();
    console.log("Token : ", token)

    const response = await fetch("https://api.liveavatar.com/v1/sessions/start", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`, // session token from previous step
      },
    });

    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("LiveAvatar Start Error:", error);

    return NextResponse.json(
      { error: "Failed to start session" },
      { status: 500 }
    );
  }
}