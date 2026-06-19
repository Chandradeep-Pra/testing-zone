import { NextRequest, NextResponse } from "next/server";
import { getUrologicsApiUrl } from "@/lib/urologics-api";

export async function GET(req: NextRequest) {
  const idToken = req.cookies.get("urologics_id_token")?.value;

  if (!idToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const response = await fetch(getUrologicsApiUrl("/api/app/mocks"), {
      headers: {
        Authorization: `Bearer ${idToken}`,
      },
      cache: "no-store",
    });
    const payload = await response.json().catch(() => ({}));

    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    console.error("Failed to load mocks:", error);

    return NextResponse.json(
      { error: "Failed to load mocks" },
      { status: 500 }
    );
  }
}
