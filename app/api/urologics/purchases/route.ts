import { NextRequest, NextResponse } from "next/server";
import { getAuthHeader, getUrologicsApiUrl } from "@/lib/urologics-api";
export async function GET(req: NextRequest) {
  const auth = getAuthHeader(req); if (!auth) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  try { const response = await fetch(getUrologicsApiUrl("/api/purchases"), { headers: { Authorization: auth }, cache: "no-store" }); return NextResponse.json(await response.json().catch(() => ({})), { status: response.status }); }
  catch { return NextResponse.json({ error: "Unable to load purchases" }, { status: 502 }); }
}
