import { NextRequest, NextResponse } from "next/server";
import { getUrologicsApiUrl } from "@/lib/urologics-api";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const token = req.cookies.get("__session")?.value;
    const response = await fetch(getUrologicsApiUrl(`/api/${token ? "app" : "public"}/mocks/${encodeURIComponent(id)}/results`), {
      headers: token ? { Authorization: `Bearer ${token}` } : {}, cache: "no-store",
    });
    return NextResponse.json(await response.json(), { status: response.status, headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("Mock results proxy error:", error);
    return NextResponse.json({ error: "Unable to load rankings" }, { status: 500 });
  }
}
