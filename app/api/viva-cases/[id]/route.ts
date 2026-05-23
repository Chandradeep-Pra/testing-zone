import { NextResponse } from "next/server";

import { fetchRemoteVivaCaseById, getDefaultVivaCase } from "@/lib/viva-case";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const vivaCase = await fetchRemoteVivaCaseById(id);

    if (!vivaCase) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }

    return NextResponse.json({ case: vivaCase });
  } catch (error) {
    console.error("Failed to load viva case:", error);
    const { id } = await params;
    const fallback = getDefaultVivaCase();

    if (id === fallback.id) {
      return NextResponse.json({
        case: fallback,
        warning: "Remote viva case is unavailable. Showing the default case.",
      });
    }

    return NextResponse.json({ error: "Case not found" }, { status: 404 });
  }
}
