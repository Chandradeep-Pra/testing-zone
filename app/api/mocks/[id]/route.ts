import { NextRequest, NextResponse } from "next/server";
import { getUrologicsApiUrl } from "@/lib/urologics-api";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const idToken = req.cookies.get("urologics_id_token")?.value;

  if (!idToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;

    const res = await fetch(getUrologicsApiUrl(`/api/app/mocks/${encodeURIComponent(id)}`), {
      headers: {
        Authorization: `Bearer ${idToken}`,
      },
      cache: "no-store",
    });

    const data = await res.json().catch(() => ({}));

    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    console.error("Proxy error:", err);

    return NextResponse.json(
      { error: "Failed to fetch mock" },
      { status: 500 },
    );
  }
}
