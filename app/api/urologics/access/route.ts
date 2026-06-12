import { NextRequest, NextResponse } from "next/server";
import { getAuthHeader, getUrologicsApiUrl } from "@/lib/urologics-api";

export async function GET(req: NextRequest) {
  const authHeader = getAuthHeader(req);

  if (!authHeader) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const response = await fetch(getUrologicsApiUrl("/api/app/access"), {
      headers: {
        Authorization: authHeader,
      },
      cache: "no-store",
    });
    const payload = await response.json().catch(() => ({}));

    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    console.error("Urologics access proxy error:", error);
    return NextResponse.json(
      { error: "Failed to verify Urologics access" },
      { status: 500 }
    );
  }
}
