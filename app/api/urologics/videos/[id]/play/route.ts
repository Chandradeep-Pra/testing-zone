import { NextRequest, NextResponse } from "next/server";
import { getAuthHeader, getUrologicsApiUrl } from "@/lib/urologics-api";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const authHeader = getAuthHeader(req);

  if (!authHeader) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const response = await fetch(
      getUrologicsApiUrl(`/api/app/videos/${encodeURIComponent(id)}/play`),
      {
        headers: {
          Authorization: authHeader,
        },
        cache: "no-store",
      }
    );
    const payload = await response.json().catch(() => ({}));

    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    console.error("Urologics video play proxy error:", error);
    return NextResponse.json(
      { error: "Failed to prepare Urologics video" },
      { status: 500 }
    );
  }
}
