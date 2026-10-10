/**
 * Utility for managing fresh mock session state and clearing cached attempts
 */

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

