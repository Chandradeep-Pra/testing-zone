import { appPath } from "@/lib/app-path";
import { getStoredAuth, refreshStoredAuth, type UrologicsUser } from "@/lib/urologics-auth";

export class ApiReadError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

export const accountQueryKey = (uid: string | undefined, path: string) => ["urologics", uid || "guest", path] as const;

export async function readUrologicsJson<T>(path: string, user: UrologicsUser | null, signal?: AbortSignal): Promise<T> {
  const controller = new AbortController();
  const onAbort = () => controller.abort();
  signal?.addEventListener("abort", onAbort, { once: true });
  if (signal?.aborted) controller.abort();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    let currentUser = user;
    const stored = user ? getStoredAuth() : null;
    if (stored?.uid === user?.uid && stored) currentUser = stored;
    if (currentUser && currentUser.expiresAt <= Date.now() + 60_000) currentUser = await refreshStoredAuth(currentUser);
    const request = () => fetch(appPath(path), {
      headers: currentUser ? { Authorization: `Bearer ${currentUser.idToken}` } : undefined,
      signal: controller.signal,
      cache: "no-store",
    });
    let response = await request();
    if (response.status === 401 && currentUser && !controller.signal.aborted) {
      currentUser = await refreshStoredAuth(currentUser);
      response = await request();
    }
    const payload = await response.json();
    if (!response.ok) throw new ApiReadError(payload.error || "Unable to load data. Please try again.", response.status);
    return payload as T;
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", onAbort);
  }
}

export function retryRead(failureCount: number, error: Error) {
  if (error.name === "AbortError" || failureCount >= 2) return false;
  return !(error instanceof ApiReadError) || error.status === 429 || error.status >= 500;
}
