import { NextRequest, NextResponse } from "next/server";
import { getAuthHeader, forwardUrologicsJson } from "@/lib/urologics-api";

export async function GET(req: NextRequest) {
  if (!getAuthHeader(req)) {
    return NextResponse.json({ error: "Unauthorized" }, {
      status: 401, headers: { "Cache-Control": "private, no-store" },
    });
  }

  try {
    return await forwardUrologicsJson(req, "/api/app/me/video-progress");
  } catch (error) {
    if (!req.signal.aborted) console.error("Urologics video history proxy error:", error);
    return NextResponse.json({ error: "Unable to load lesson history" }, {
      status: 502, headers: { "Cache-Control": "private, no-store" },
    });
  }
}
