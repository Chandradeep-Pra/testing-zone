import { NextResponse } from "next/server";

import { fetchRemoteMocks } from "@/lib/mocks";

export async function GET() {
  try {
    const mocks = await fetchRemoteMocks();
    const publicMocks = mocks.filter((mock) => mock.accessType === "public");

    return NextResponse.json({ mocks: publicMocks });
  } catch (error) {
    console.error("Failed to load public mocks:", error);

    return NextResponse.json(
      { error: "Failed to load public mocks" },
      { status: 500 }
    );
  }
}
