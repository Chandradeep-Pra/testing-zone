import { NextRequest, NextResponse } from "next/server";
import { getAuthHeader, getUrologicsApiUrl } from "@/lib/urologics-api";

export async function POST(req: NextRequest) {
  const authorization = getAuthHeader(req);
  if (!authorization) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const formData = await req.formData();
    const response = await fetch(getUrologicsApiUrl("/api/app/profile/image"), {
      method: "POST",
      headers: { Authorization: authorization },
      body: formData,
      cache: "no-store",
    });
    const payload = await response.json().catch(() => ({}));

    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    console.error("Urologics Cloudinary upload proxy error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
