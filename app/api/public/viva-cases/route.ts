import { NextResponse } from "next/server";

import { fetchRemotePublicVivaCases } from "@/lib/viva-case";

export async function GET() {
  try {
    const cases = await fetchRemotePublicVivaCases();
    return NextResponse.json({ cases });
  } catch (error) {
    console.error("Failed to load public viva cases:", error);
    return NextResponse.json(
      { error: "Failed to load public viva cases" },
      { status: 500 }
    );
  }
}
