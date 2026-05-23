import { NextResponse } from "next/server";

import { fetchRemotePublicVivaCaseById } from "@/lib/viva-case";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const vivaCase = await fetchRemotePublicVivaCaseById(id);

    if (!vivaCase) {
      return NextResponse.json(
        { error: "This viva case is not publicly available." },
        { status: 404 }
      );
    }

    return NextResponse.json({ case: vivaCase });
  } catch (error) {
    console.error("Failed to load public viva case:", error);
    return NextResponse.json(
      { error: "Failed to load public viva case" },
      { status: 500 }
    );
  }
}
