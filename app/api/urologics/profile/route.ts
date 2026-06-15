import { NextRequest, NextResponse } from "next/server";
import { getAuthHeader, getUrologicsApiUrl } from "@/lib/urologics-api";

export async function PATCH(req: NextRequest) {
  const authHeader = getAuthHeader(req);

  if (!authHeader) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const response = await fetch(getUrologicsApiUrl("/api/app/profile"), {
      method: "PATCH",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    const payload = await response.json().catch(() => ({}));

    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    console.error("Urologics profile proxy error:", error);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}
