import { NextResponse } from "next/server";

const UPSTREAM = "https://urologics.co.uk/api/public/mocks";

type RawAttempt = {
  candidate?: { name?: string; email?: string };
  name?: string;
  marks?: number;
  createdAt?: unknown;
};

function extractAttempts(payload: unknown): RawAttempt[] {
  if (!payload || typeof payload !== "object") return [];
  const source = payload as Record<string, unknown>;
  for (const key of ["attempts", "results", "leaderboard"]) {
    if (Array.isArray(source[key])) return source[key] as RawAttempt[];
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
    let attempts: RawAttempt[] = [];

    const res = await fetch(`${UPSTREAM}/${id}/results`, { cache: "no-store" });
    if (res.ok) {
      attempts = extractAttempts(await res.json());
    } else {
      // The list endpoint already embeds attempts for each mock.
      const listRes = await fetch(UPSTREAM, { cache: "no-store" });
      if (listRes.ok) {
        const list = (await listRes.json()) as { mocks?: Array<{ id?: string }> };
        attempts = extractAttempts(list.mocks?.find((mock) => mock.id === id));
      }
    }

    const results = attempts.map((attempt) => ({
      name: attempt.candidate?.name || attempt.name || "Anonymous",
      email: (attempt.candidate?.email || "").toLowerCase(),
      marks: Number(attempt.marks) || 0,
      createdAt: typeof attempt.createdAt === "string" ? attempt.createdAt : null,
    }));

    return NextResponse.json({ results });
  } catch (error) {
    console.error("Failed to load mock results:", error);
    return NextResponse.json({ error: "Failed to load mock results" }, { status: 500 });
  }
}
