import { NextRequest, NextResponse } from "next/server";
import { getUrologicsApiUrl } from "@/lib/urologics-api";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type AttemptPayload = {
  marks?: number;
  correctCount?: number;
  totalQuestions?: number;
  timeTakenSeconds?: number;
  name?: string;
  email?: string;
  userImage?: string;
};

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const idToken = req.cookies.get("__session")?.value;

  try {
    const { id } = await params;
    const body = (await req.json()) as AttemptPayload;

    if (typeof body.marks !== "number") {
      return NextResponse.json(
        { success: false, error: "Invalid attempt payload" },
        { status: 400 },
      );
    }

    if (!idToken) {
      // Support public candidate submission if name and email are present
      if (body.name && body.email) {
        const pubResponse = await fetch(
          getUrologicsApiUrl(`/api/public/mocks/${encodeURIComponent(id)}/attempts`),
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: body.name,
              email: body.email,
              marks: body.marks,
              userImage: body.userImage,
              totalQuestions: body.totalQuestions,
            }),
            cache: "no-store",
          }
        );
        const pubPayload = await pubResponse.json().catch(() => ({}));
        return NextResponse.json(pubPayload, { status: pubResponse.status });
      }

      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

    return NextResponse.json(payload, {
      status: response.status,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
  } catch (error) {
    console.error("Mock attempt proxy error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to submit mock attempt" },
      { status: 500 },
    );
  }
}
