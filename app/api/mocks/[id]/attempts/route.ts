import { NextRequest, NextResponse } from "next/server";
import { getUrologicsApiUrl } from "@/lib/urologics-api";

type AttemptPayload = {
  marks?: number;
  correctCount?: number;
  totalQuestions?: number;
  timeTakenSeconds?: number;
};

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const idToken = req.cookies.get("urologics_id_token")?.value;

  if (!idToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = (await req.json()) as AttemptPayload;

    if (typeof body.marks !== "number") {
      return NextResponse.json(
        { success: false, error: "Invalid attempt payload" },
        { status: 400 },
      );
    }

    const response = await fetch(
      getUrologicsApiUrl(`/api/app/mocks/${encodeURIComponent(id)}/attempts`),
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify(body),
        cache: "no-store",
      },
    );
    const payload = await response.json().catch(() => ({}));

    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    console.error("Mock attempt proxy error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to submit mock attempt" },
      { status: 500 },
    );
  }
}
