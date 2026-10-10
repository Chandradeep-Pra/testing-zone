import { NextResponse } from "next/server";
import { getUrologicsApiUrl } from "@/lib/urologics-api";
import { formatRelativeAttended } from "@/lib/format-relative-time";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type UpstreamResult = {
  rank?: number;
  name?: string;
  email?: string;
  userImage?: string | null;
  marks?: number;
  maxMarks?: number | null;
  attended?: string;
  submittedAt?: string | null;
  createdAt?: string | null;
  candidate?: {
    name?: string;
    email?: string;
    image?: string | null;
    userImage?: string | null;
  };
};

function extractAttempts(payload: unknown): UpstreamResult[] {
  if (!payload || typeof payload !== "object") return [];
  const source = payload as Record<string, unknown>;
  for (const key of ["results", "attempts", "leaderboard"]) {
    if (Array.isArray(source[key])) return source[key] as UpstreamResult[];
  }
  for (const key of ["mock", "data"]) {
    const nested = extractAttempts(source[key]);
    if (nested.length) return nested;
  }
  return [];
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const url = getUrologicsApiUrl(
      `/api/public/mocks/${encodeURIComponent(id)}/results?_t=${Date.now()}`
    );

    let rawList: UpstreamResult[] = [];
    const res = await fetch(url, {
      cache: "no-store",
      headers: {
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
      },
    });

    if (res.ok) {
      const data = await res.json();
      rawList = extractAttempts(data);
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
        rawList = extractAttempts(found);
      }
    }

    // Deduplicate by student email/name keeping latest attempt only
    const candidateMap = new Map<string, UpstreamResult>();
    for (const item of rawList) {
      const email = String(item.candidate?.email || item.email || "").trim().toLowerCase();
      const name = String(item.candidate?.name || item.name || "").trim();
      const key = email || name.toLowerCase();
      if (!key) continue;

      const dateStr = item.submittedAt || item.createdAt || "";
      const existing = candidateMap.get(key);
      if (!existing) {
        candidateMap.set(key, item);
      } else {
        const existingTime = Date.parse(existing.submittedAt || existing.createdAt || "") || 0;
        const currentTime = Date.parse(dateStr) || 0;
        if (currentTime >= existingTime) {
          candidateMap.set(key, item);
        }
      }
    }

    const deduplicated = Array.from(candidateMap.values());
    deduplicated.sort((a, b) => {
      const marksA = Number(a.marks || 0);
      const marksB = Number(b.marks || 0);
      if (marksB !== marksA) return marksB - marksA;
      const timeA = Date.parse(a.submittedAt || a.createdAt || "") || 0;
      const timeB = Date.parse(b.submittedAt || b.createdAt || "") || 0;
      return timeB - timeA;
    });

    const results = deduplicated.map((entry, index) => {
      const name = entry.candidate?.name || entry.name || "Anonymous";
      const email = (entry.candidate?.email || entry.email || "").toLowerCase();
      const userImage =
        entry.candidate?.image ||
        entry.candidate?.userImage ||
        entry.userImage ||
        null;
      const marks = Number(entry.marks) || 0;
      const submittedAt = entry.submittedAt || entry.createdAt || null;
      const attended = entry.attended || formatRelativeAttended(submittedAt);

      return {
        rank: index + 1,
        name,
        email,
        userImage: typeof userImage === "string" && userImage.trim() ? userImage.trim() : null,
        marks,
        maxMarks: entry.maxMarks ?? null,
        attended,
        submittedAt,
        createdAt: submittedAt,
      };
    });

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
