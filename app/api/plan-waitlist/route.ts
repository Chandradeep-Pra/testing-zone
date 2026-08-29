import { NextRequest, NextResponse } from "next/server";
import { getAuthHeader, getUrologicsApiUrl } from "@/lib/urologics-api";
export async function POST(req: NextRequest) {
  const auth = getAuthHeader(req); if (!auth) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  try { const response = await fetch(getUrologicsApiUrl("/api/pricing-plans/waitlist"), { method: "POST", headers: { Authorization: auth, "Content-Type": "application/json" }, body: JSON.stringify(await req.json()), cache: "no-store" }); return NextResponse.json(await response.json().catch(() => ({})), { status: response.status }); }
  catch { return NextResponse.json({ error: "Unable to submit course request" }, { status: 502 }); }
}
