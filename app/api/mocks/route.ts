import { NextResponse } from "next/server";
import { fetchRemoteMocks } from "@/lib/mocks";

export async function GET() {
  try {
    const mocks = await fetchRemoteMocks();

    return NextResponse.json({ mocks });
  } catch (error) {
    console.error("Failed to load mocks:", error);

    return NextResponse.json(
      { error: "Failed to load mocks" },
      { status: 500 }
    );
  }
}