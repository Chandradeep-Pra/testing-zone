import { NextRequest, NextResponse } from "next/server";

type AttemptPayload = {
  name?: string;
  email?: string;
  marks?: number;
  userImage?: string;
};

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = (await req.json()) as AttemptPayload;
    const normalizedEmail = String(body.email || "")
      .trim()
      .toLowerCase();

    if (!body.name || !normalizedEmail || typeof body.marks !== "number") {
      return NextResponse.json(
        { success: false, error: "Invalid attempt payload" },
        { status: 400 },
      );
    }

    const res = await fetch(`https://urologics.co.uk/api/public/mocks/${id}/attempts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: body.name,
        email: normalizedEmail,
        marks: body.marks,
        userImage:
          typeof body.userImage === "string" && body.userImage.trim()
            ? body.userImage.trim()
            : undefined,
      }),
      cache: "no-store",
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error("Public mock attempt proxy error:", error);

    return NextResponse.json(
      { success: false, error: "Failed to submit public mock attempt" },
      { status: 500 },
    );
  }
}
