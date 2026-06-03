import { NextResponse } from "next/server";

import { fetchRemotePublicMockById } from "@/lib/mocks";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const mock = await fetchRemotePublicMockById(id);

    if (!mock) {
      return NextResponse.json(
        { error: "This mock is not publicly available." },
        { status: 404 }
      );
    }

    return NextResponse.json({ mock });
  } catch (error) {
    console.error("Failed to load public mock:", error);

    return NextResponse.json(
      { error: "Failed to load public mock" },
      { status: 500 }
    );
  }
}
