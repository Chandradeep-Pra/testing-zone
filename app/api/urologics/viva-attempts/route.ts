import { NextRequest, NextResponse } from "next/server";

import { getAuthHeader, getUrologicsApiUrl } from "@/lib/urologics-api";

export async function POST(req: NextRequest) {
  const authHeader = getAuthHeader(req);

  if (!authHeader) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const response = await fetch(getUrologicsApiUrl("/api/app/viva-attempts"), {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const payload = await response.json().catch(() => ({}));

    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    console.error("Urologics viva attempt proxy error:", error);
    return NextResponse.json(
      { error: "Failed to save Urologics viva attempt" },
      { status: 500 }
    );
  }
}
