import { NextRequest, NextResponse } from "next/server";
import { getUrologicsApiUrl } from "@/lib/urologics-api";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const response = await fetch(getUrologicsApiUrl("/api/cloudinary-upload"), {
      method: "POST",
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
