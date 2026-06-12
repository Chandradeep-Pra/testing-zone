import { NextResponse } from "next/server";
import { getUrologicsApiUrl } from "@/lib/urologics-api";

export async function GET() {
  try {
    const response = await fetch(getUrologicsApiUrl("/api/daily-quiz"), {
      cache: "no-store",
    });
    const payload = await response.json().catch(() => ({}));

    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    console.error("Urologics daily quiz proxy error:", error);
    return NextResponse.json(
      { error: "Failed to load Urologics daily quiz" },
      { status: 500 }
    );
  }
}
