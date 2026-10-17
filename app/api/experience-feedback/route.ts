import { NextRequest, NextResponse } from "next/server";
import { getUrologicsApiUrl } from "@/lib/urologics-api";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) return NextResponse.json({ error: "Invalid feedback payload." }, { status: 400 });
    const token = req.cookies.get("__session")?.value;
    const response = await fetch(getUrologicsApiUrl(`/api/${token ? "app" : "public"}/experience-feedback`), {
      method: "POST", cache: "no-store",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ ...body, platform: "web" }),
      signal: AbortSignal.timeout(10_000),
    });
    return NextResponse.json(await response.json(), { status: response.status, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof SyntaxError ? "Invalid feedback payload." : "Unable to save feedback. Please retry or skip." }, { status: error instanceof SyntaxError ? 400 : 502 });
  }
}
