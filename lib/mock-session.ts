/**
 * Utility for managing fresh mock session state and clearing cached attempts
 */

export type CompletedMockAttempt = {
  candidateEmail: string;
  answers: Record<string, number>;
  marks: number;
  totalQuestions: number;
  submittedAt: string;
};

export function getMockCandidateEmail(userEmail?: string | null): string {
  if (userEmail?.trim()) return userEmail.trim().toLowerCase();
  if (typeof window === "undefined") return "";
  try {
    const saved = JSON.parse(localStorage.getItem("urologics-candidate-verification") || localStorage.getItem("mockUser") || "{}");
    return typeof saved.email === "string" ? saved.email.trim().toLowerCase() : "";
  } catch { return ""; }
}

export function saveCompletedMockAttempt(id: string, attempt: CompletedMockAttempt) {
  if (typeof window === "undefined" || !attempt.candidateEmail.trim()) return;
  const email = attempt.candidateEmail.trim().toLowerCase();
  try {
    localStorage.setItem(`mock-${id}-latest-attempt:${encodeURIComponent(email)}`, JSON.stringify({ ...attempt, candidateEmail: email }));
  } catch (error) { console.error("Unable to cache the completed mock attempt:", error); }
}

export function readCompletedMockAttempt(id: string, candidateEmail: string): CompletedMockAttempt | null {
  if (typeof window === "undefined" || !candidateEmail.trim()) return null;
  const email = candidateEmail.trim().toLowerCase();
  try {
    const raw = localStorage.getItem(`mock-${id}-latest-attempt:${encodeURIComponent(email)}`);
    if (!raw) return null;
    const attempt = JSON.parse(raw) as CompletedMockAttempt;
    if (attempt.candidateEmail !== email || !Number.isFinite(attempt.marks) || !Number.isInteger(attempt.totalQuestions)
      || attempt.totalQuestions <= 0 || attempt.marks < 0 || attempt.marks > attempt.totalQuestions
      || !Number.isFinite(Date.parse(attempt.submittedAt)) || !attempt.answers || typeof attempt.answers !== "object" || Array.isArray(attempt.answers)) return null;
    return attempt;
  } catch { return null; }
}

export type MockAttemptView = {
  marks: number;
  totalQuestions: number;
  answers: Record<string, number> | null;
  submittedAt: string | null;
};

/** Prefer a newer completed run without changing the ranked first-attempt record. */
export function resolveMockAttempt(mock: unknown, cached: CompletedMockAttempt | null, candidateEmail = ""): MockAttemptView | null {
  if (!mock || typeof mock !== "object") return cached;
  const source = mock as Record<string, unknown>;
  let raw = (source.latestAttempt ?? source.currentAttempt ?? source.userAttempt) as Record<string, unknown> | undefined;
  if (candidateEmail && Array.isArray(source.attempts)) {
    for (const value of source.attempts) {
      if (!value || typeof value !== "object") continue;
      const attempt = value as Record<string, unknown>;
      const candidate = attempt.candidate as { email?: string } | undefined;
      if (String(candidate?.email || attempt.email || "").trim().toLowerCase() !== candidateEmail.trim().toLowerCase()) continue;
      const time = Date.parse(String(attempt.submittedAt || attempt.createdAt || ""));
      const previousTime = Date.parse(String(raw?.submittedAt || raw?.createdAt || ""));
      if (!raw || (Number.isFinite(time) && (!Number.isFinite(previousTime) || time > previousTime))) raw = attempt;
    }
  }
  const score = raw?.score ?? raw?.marks;
  const submittedAt = typeof raw?.submittedAt === "string" ? raw.submittedAt : typeof raw?.createdAt === "string" ? raw.createdAt : null;
  const time = submittedAt ? Date.parse(submittedAt) : NaN;
  if (cached && (!Number.isFinite(time) || Date.parse(cached.submittedAt) > time)) return cached;
  if (score === undefined || score === null || !Number.isFinite(Number(score))) return cached;
  const total = raw?.totalQuestions ?? raw?.maxMarks ?? (Array.isArray(source.questions) ? source.questions.length : 0);
  const answers = raw?.answers;
  return {
    marks: Number(score),
    totalQuestions: Number(total) || 0,
    submittedAt,
    answers: answers && typeof answers === "object" && !Array.isArray(answers) ? answers as Record<string, number> : null,
  };
}

export function clearMockSession(id: string) {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(`mock-${id}-answers`);
    localStorage.removeItem(`mock-${id}-flagged`);
    localStorage.removeItem(`mock-${id}-final`);
    localStorage.removeItem(`mock-${id}-summary`);
    localStorage.removeItem(`mock-${id}-started-at`);
    sessionStorage.removeItem(`mock-${id}-attempt-submitted`);
    sessionStorage.removeItem(`mock-${id}-is-fresh`);
  } catch (err) {
    console.error("Failed to clear mock session storage:", err);
  }
}

export function startFreshMockSession(id: string): string {
  if (typeof window === "undefined") return `${Date.now()}`;

  const runId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  try {
    // 1. Wipe all artifacts from previous sessions
    localStorage.removeItem(`mock-${id}-answers`);
    localStorage.removeItem(`mock-${id}-flagged`);
    localStorage.removeItem(`mock-${id}-final`);
    localStorage.removeItem(`mock-${id}-summary`);
    sessionStorage.removeItem(`mock-${id}-attempt-submitted`);

    // 2. Set new unique run and fresh session marker
    localStorage.setItem(`mock-${id}-run-id`, runId);
    localStorage.setItem(`mock-${id}-started-at`, String(Date.now()));
    sessionStorage.setItem(`mock-${id}-is-fresh`, "true");
    sessionStorage.removeItem(`mock-${id}-${runId}-attempt-submitted`);
  } catch (err) {
    console.error("Failed to start fresh mock session:", err);
  }

  return runId;
}

