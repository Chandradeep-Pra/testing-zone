import { NextResponse } from "next/server";

import { fetchRemoteVivaCases } from "@/lib/viva-case";

export async function GET() {
  try {
    const cases = await fetchRemoteVivaCases();
    return NextResponse.json({ cases });
  } catch (error) {
    console.error("Failed to load viva cases:", error);
    return NextResponse.json(
      { error: "Failed to load viva cases" },
      { status: 500 }
    );
  }
}
