import { NextResponse } from "next/server";

import { fetchRemoteVivaCases, getDefaultVivaCase } from "@/lib/viva-case";

export async function GET() {
  try {
    const cases = await fetchRemoteVivaCases();
    return NextResponse.json({ cases });
  } catch (error) {
    console.error("Failed to load viva cases:", error);
    return NextResponse.json({
      cases: [getDefaultVivaCase()],
      warning: "Remote viva cases are unavailable. Showing the default case.",
    });
  }
}
