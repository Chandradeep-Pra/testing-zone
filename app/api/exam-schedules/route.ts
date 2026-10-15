import { NextResponse } from "next/server";
import { getUrologicsApiUrl } from "@/lib/urologics-api";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Public proxy for exam schedules — no auth required to read upcoming exams.
 * Forwards to urocms /api/exam-schedules (which is admin-protected server-side).
 * We expose only the fields needed for the countdown banner (examName, examDate).
 */
export async function GET() {
  try {
    const response = await fetch(
      getUrologicsApiUrl("/api/public/exam-schedules"),
      { cache: "no-store" },
    );

    if (!response.ok) {
      // Graceful degradation — return empty array so UI hides the banner
      return NextResponse.json({ schedules: [] });
    }

    const payload = await response.json().catch(() => ({ schedules: [] }));
    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60",
      },
    });
  } catch {
    return NextResponse.json({ schedules: [] });
  }
}

