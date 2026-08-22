import { NextResponse } from "next/server";

import { getAuthHeader, getUrologicsApiUrl } from "@/lib/urologics-api";

export async function POST(req: Request) {
  const authHeader = getAuthHeader(req);

  if (!authHeader) {
    return NextResponse.json({ error: "Authorization token is required" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const response = await fetch(getUrologicsApiUrl("/api/viva-cases/generate-questions"), {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...body,
        mode: "calmAndComposed",
      }),
      cache: "no-store",
    });
    const payload = await response.json().catch(() => ({
      error: "Unable to generate Calm and Composed questions",
    }));

    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    console.error("Calm question generation failed:", error);
    return NextResponse.json(
      { error: "Unable to generate Calm and Composed questions" },
      { status: 500 },
    );
  }
}
