import { NextRequest, NextResponse } from "next/server";
import { getUrologicsApiUrl } from "@/lib/urologics-api";
export async function POST(req: NextRequest) {
  try { const response = await fetch(getUrologicsApiUrl("/api/payment-queries"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(await req.json()), cache: "no-store" }); return NextResponse.json(await response.json().catch(() => ({})), { status: response.status }); }
  catch { return NextResponse.json({ error: "Unable to raise payment concern" }, { status: 502 }); }
}
