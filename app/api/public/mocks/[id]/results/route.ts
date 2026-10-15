import { NextResponse } from "next/server";
import { getUrologicsApiUrl } from "@/lib/urologics-api";
import { extractMockAttempts, firstAttemptRankings } from "@/lib/mock-ranking";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const url = getUrologicsApiUrl(
      `/api/public/mocks/${encodeURIComponent(id)}/results?_t=${Date.now()}`
    );

    let rawList: Record<string, unknown>[] = [];
    const res = await fetch(url, {
      cache: "no-store",
      headers: {
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
      },
    });

    if (res.ok) {
      const data = await res.json();
      rawList = extractMockAttempts(data);
    } else {
      // Fallback: list endpoint
      const listUrl = getUrologicsApiUrl(`/api/public/mocks?_t=${Date.now()}`);
      const listRes = await fetch(listUrl, {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      });
      if (listRes.ok) {
        const listData = (await listRes.json()) as { mocks?: Array<{ id?: string }> };
        const found = listData.mocks?.find((m) => m.id === id);
        rawList = extractMockAttempts(found);
      }
    }

    const results = firstAttemptRankings(rawList);

    return NextResponse.json(
      { results },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );
  } catch (error) {
    console.error("Failed to load mock results:", error);
    return NextResponse.json(
      { error: "Failed to load mock results", results: [] },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );
  }
}
