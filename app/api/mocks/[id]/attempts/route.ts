import { NextRequest, NextResponse } from "next/server";

type AttemptPayload = {
  name?: string;
  email?: string;
  marks?: number;
};

type MockAttempt = {
  candidate?: {
    email?: string;
  };
};

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = (await req.json()) as AttemptPayload;
    const normalizedEmail = String(body.email || "").trim().toLowerCase();

    if (!body.name || !normalizedEmail || typeof body.marks !== "number") {
      return NextResponse.json(
        { success: false, error: "Invalid attempt payload" },
        { status: 400 }
      );
    }

    const mockRes = await fetch(`https://urocms.vercel.app/api/mocks/${id}`, {
      cache: "no-store",
    });

    if (!mockRes.ok) {
      throw new Error(`Failed to load mock before attempt submission (${mockRes.status})`);
    }

    const mockData = (await mockRes.json()) as { mock?: { attempts?: MockAttempt[] }; attempts?: MockAttempt[] };
    const attempts = Array.isArray(mockData.mock?.attempts)
      ? mockData.mock.attempts
      : Array.isArray(mockData.attempts)
        ? mockData.attempts
        : [];

    const alreadyAttempted = attempts.some(
      (attempt) =>
        String(attempt?.candidate?.email || "").trim().toLowerCase() === normalizedEmail
    );

    if (alreadyAttempted) {
      return NextResponse.json(
        { success: false, error: "This email has already been used for this mock" },
        { status: 409 }
      );
    }

    const res = await fetch(`https://urocms.vercel.app/api/mocks/${id}/attempts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: body.name,
        email: normalizedEmail,
        marks: body.marks,
      }),
      cache: "no-store",
    });

    const data = await res.json();

    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error("Mock attempt proxy error:", error);

    return NextResponse.json(
      { success: false, error: "Failed to submit mock attempt" },
      { status: 500 }
    );
  }
}
