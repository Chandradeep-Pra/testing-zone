import { NextRequest, NextResponse } from "next/server";
import { getAuthHeader, getUrologicsApiUrl } from "@/lib/urologics-api";

export async function GET(req: NextRequest) {
  const authHeader = getAuthHeader(req);

  try {
    const response = await fetch(getUrologicsApiUrl(
      authHeader ? "/api/app/videos/library" : "/api/public/videos/library"
    ), {
      headers: authHeader
        ? {
            Authorization: authHeader,
          }
        : undefined,
      cache: "no-store",
    });
    const payload = await response.json().catch(() => ({}));

    if (authHeader && response.status === 401) {
      const publicResponse = await fetch(getUrologicsApiUrl("/api/public/videos/library"), {
        cache: "no-store",
      });
      const publicPayload = await publicResponse.json().catch(() => ({}));

      return NextResponse.json(publicPayload, {
        status: publicResponse.status,
        headers: {
          "Cache-Control": "no-store",
        },
      });
    }

    return NextResponse.json(payload, {
      status: response.status,
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Urologics video library proxy error:", error);
    return NextResponse.json(
      { error: "Failed to load Urologics video library" },
      { status: 500 }
    );
  }
}
