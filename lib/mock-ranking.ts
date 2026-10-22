import { formatRelativeAttended } from "./format-relative-time";

export type MockRankResult = {
  rank: number;
  name: string;
  email: string;
  userImage: string | null;
  marks: number;
  maxMarks: number | null;
  timeTakenSeconds: number | null;
  submittedAt: string | null;
  createdAt: string | null;
  attended: string;
};

type Row = Record<string, unknown>;
const record = (value: unknown): Row => value && typeof value === "object" ? value as Row : {};
const text = (value: unknown) => typeof value === "string" ? value.trim() : "";

export function recordedMockTime(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
}

export function formatMockDuration(seconds: number | null | undefined): string {
  const value = recordedMockTime(seconds);
  if (value === null) return "Not recorded";
  const rounded = Math.floor(value);
  return `${Math.floor(rounded / 60)}m ${String(rounded % 60).padStart(2, "0")}s`;
}

function compareCompletionTime(a: Row, b: Row): number {
  const first = recordedMockTime(a.timeTakenSeconds) ?? Infinity;
  const second = recordedMockTime(b.timeTakenSeconds) ?? Infinity;
  return first === second ? 0 : first - second;
}

// Keep in sync with urocms/lib/server/mockAttempts.ts.
const HIDDEN_RANK_EMAILS = new Set([
  "urologoics.org@gmail.com",
  "chandradeepp611@gmail.com",
  "ankitgoel042@gmail.com",
]);

function imageFrom(...values: unknown[]): string | null {
  return values.map(text).find(Boolean) || null;
}

export function extractMockAttempts(payload: unknown): Row[] {
  if (Array.isArray(payload)) return payload.map(record);
  const source = record(payload);
  for (const key of ["results", "attempts", "leaderboard"]) {
    if (Array.isArray(source[key])) return (source[key] as unknown[]).map(record);
  }
  for (const key of ["mock", "data"]) {
    const nested = source[key] ? extractMockAttempts(source[key]) : [];
    if (nested.length) return nested;
  }
  return [];
}

function attemptTime(row: Row) {
  const time = Date.parse(text(row.submittedAt) || text(row.createdAt));
  return Number.isFinite(time) ? time : null;
}

function isEarlier(candidate: Row, existing: Row) {
  const candidateNumber = Number(candidate.attemptNumber);
  const existingNumber = Number(existing.attemptNumber);
  if (candidateNumber > 0 && existingNumber > 0 && candidateNumber !== existingNumber) return candidateNumber < existingNumber;
  const candidateTime = attemptTime(candidate);
  const existingTime = attemptTime(existing);
  // A missing timestamp is not proof that an attempt predates a dated record.
  return candidateTime !== null && (existingTime === null || candidateTime < existingTime);
}

/** Rank each candidate's earliest recorded attempt, never their best reattempt. */
export function firstAttemptRankings(payload: unknown): MockRankResult[] {
  const candidates = new Map<string, Row>();
  let hadDuplicates = false;
  let selectedEmbeddedFirst = false;
  let excludedReattempts = false;
  let excludedAccounts = false;
  for (const original of extractMockAttempts(payload)) {
    const first = record(original.firstAttempt);
    const row = Object.keys(first).length ? {
      ...original, ...first, attemptNumber: 1, isFirstAttempt: true,
      marks: first.marks ?? first.score,
      submittedAt: first.submittedAt ?? first.createdAt ?? null,
      maxMarks: first.maxMarks ?? first.totalQuestions ?? original.maxMarks ?? original.totalQuestions,
      timeTakenSeconds: recordedMockTime(first.timeTakenSeconds),
    } : original;
    if (Object.keys(first).length) selectedEmbeddedFirst = true;
    if (row.isFirstAttempt === false || Number(row.attemptNumber) > 1) { excludedReattempts = true; continue; }
    const candidate = record(row.candidate);
    const email = text(candidate.email || row.email).toLowerCase();
    if (HIDDEN_RANK_EMAILS.has(email)) { excludedAccounts = true; continue; }
    const name = text(candidate.name || row.name);
    const key = email || text(candidate.uid || row.userId) || name.toLowerCase();
    if (!key) continue;
    const existing = candidates.get(key);
    if (!existing) candidates.set(key, row);
    else {
      hadDuplicates = true;
      if (isEarlier(row, existing)) candidates.set(key, row);
    }
  }

  const rows = Array.from(candidates.values());
  // Preserve authoritative upstream ranks when the payload is already a leaderboard.
  const preserveRanks = !hadDuplicates && !selectedEmbeddedFirst && !excludedReattempts
    && rows.every((row) => Number.isInteger(row.rank) && Number(row.rank) > 0);
  rows.sort((a, b) => preserveRanks ? Number(a.rank) - Number(b.rank)
    : (Number(b.marks ?? b.score) || 0) - (Number(a.marks ?? a.score) || 0)
      || compareCompletionTime(a, b)
      || (attemptTime(a) ?? Infinity) - (attemptTime(b) ?? Infinity));

  return rows.map((row, index) => {
    const candidate = record(row.candidate);
    const submittedAt = text(row.submittedAt) || text(row.createdAt) || null;
    const maxMarks = row.maxMarks ?? row.totalQuestions;
    return {
      rank: preserveRanks && !excludedAccounts ? Number(row.rank) : index + 1,
      name: text(candidate.name || row.name) || "Anonymous",
      email: text(candidate.email || row.email).toLowerCase(),
      userImage: imageFrom(candidate.image, candidate.userImage, candidate.profileImageUrl,
        candidate.photoURL, row.userImage, row.profileImageUrl, row.photoURL, row.image),
      marks: Number(row.marks ?? row.score) || 0,
      maxMarks: maxMarks !== undefined && maxMarks !== null && Number.isFinite(Number(maxMarks)) ? Number(maxMarks) : null,
      timeTakenSeconds: recordedMockTime(row.timeTakenSeconds),
      submittedAt,
      createdAt: submittedAt,
      attended: text(row.attended) || formatRelativeAttended(submittedAt),
    };
  });
}

/** Percentage of first-attempt candidates with a strictly lower score. Ties share a percentile. */
export function mockPercentile(marks: number, results: Array<{ marks: number }>): number {
  if (!results.length) return 0;
  return Math.round(results.filter((row) => row.marks < marks).length / results.length * 1000) / 10;
}

/** Display-only standing using score then duration. Equal score and time share a position. */
export function mockEffectiveRank(marks: number, otherFirstAttempts: ReadonlyArray<{ marks: number; timeTakenSeconds?: number | null }>, timeTakenSeconds?: number | null): number | null {
  if (!Number.isFinite(marks) || marks < 0) return null;
  return 1 + otherFirstAttempts.filter((row) => Number.isFinite(row.marks) &&
    (row.marks > marks || row.marks === marks && compareCompletionTime(row, { timeTakenSeconds }) < 0)).length;
}
