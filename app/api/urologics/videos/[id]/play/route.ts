import { NextRequest, NextResponse } from "next/server";
import { getAuthHeader, getUrologicsApiUrl } from "@/lib/urologics-api";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const authHeader = getAuthHeader(req);

  try {
    const { id } = await context.params;
    const response = await fetch(
      getUrologicsApiUrl(
        authHeader
          ? `/api/app/videos/${encodeURIComponent(id)}/play`
          : `/api/public/videos/${encodeURIComponent(id)}/play`
      ),
      {
        headers: authHeader
          ? {
              Authorization: authHeader,
            }
          : undefined,
        cache: "no-store",
      }
    );
    const payload = await response.json().catch(() => ({}));

    if (authHeader && response.status === 401) {
      const publicResponse = await fetch(
        getUrologicsApiUrl(`/api/public/videos/${encodeURIComponent(id)}/play`),
        { cache: "no-store" }
      );
      const publicPayload = await publicResponse.json().catch(() => ({}));

      return NextResponse.json(publicPayload, { status: publicResponse.status });
    }

    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    console.error("Urologics video play proxy error:", error);
    return NextResponse.json(
      { error: "Failed to prepare Urologics video" },
      { status: 500 }
    );
  }
}
