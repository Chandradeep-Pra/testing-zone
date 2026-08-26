import { NextRequest, NextResponse } from "next/server";
import { getAuthHeader, getUrologicsApiUrl } from "@/lib/urologics-api";

export async function GET(req: NextRequest) {
  const auth = getAuthHeader(req);
  if (!auth) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const upstream = new URL(getUrologicsApiUrl("/api/app/checkout"));
  req.nextUrl.searchParams.forEach((value, key) => upstream.searchParams.set(key, value));
  try {
    const response = await fetch(upstream, { headers: { Authorization: auth }, cache: "no-store" });
    return NextResponse.json(await response.json().catch(() => ({})), { status: response.status });
  } catch { return NextResponse.json({ error: "Unable to open checkout" }, { status: 502 }); }
}
