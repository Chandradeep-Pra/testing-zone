import { NextRequest, NextResponse } from "next/server";
import { getAuthHeader, forwardUrologicsJson } from "@/lib/urologics-api";

export async function GET(req: NextRequest) {
  const authHeader = getAuthHeader(req);

  try {
    return await forwardUrologicsJson(req,
      authHeader ? "/api/app/videos/library" : "/api/public/videos/library"
    );
  } catch (error) {
    if (!req.signal.aborted) console.error("Urologics video library proxy error:", error);
    return NextResponse.json(
      { error: "Failed to load Urologics video library" },
      { status: 502, headers: { "Cache-Control": "private, no-store" } }
    );
  }
}
