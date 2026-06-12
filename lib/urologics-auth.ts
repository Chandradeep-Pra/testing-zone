"use client";

const FIREBASE_API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const STORAGE_KEY = "urologics-testing-zone-auth";

export type UrologicsUser = {
  uid: string;
  email: string;
  name: string;
  tier: "guest" | "free" | "paid";
  idToken: string;
  refreshToken: string;
  expiresAt: number;
  profileImageUrl: string | null;
  activeCourseIds: string[];
};

type FirebasePasswordResponse = {
  localId: string;
  email?: string;
  displayName?: string;
  idToken: string;
  refreshToken: string;
  expiresIn: string;
};

type FirebaseRefreshResponse = {
  user_id: string;
  id_token: string;
  refresh_token: string;
  expires_in: string;
};

type UrologicsAccessResponse = {
  tier?: UrologicsUser["tier"];
  profile?: {
    uid?: string;
    email?: string | null;
    name?: string | null;
    profileImageUrl?: string | null;
    activeCourseIds?: string[];
  };
};

function requireFirebaseApiKey() {
  if (!FIREBASE_API_KEY) {
    throw new Error("Missing NEXT_PUBLIC_FIREBASE_API_KEY in testing-zone environment.");
  }

  return FIREBASE_API_KEY;
}

function getFallbackName(email: string) {
  return email.split("@")[0]?.replace(/[._-]+/g, " ").trim() || "Learner";
}

function toExpiresAt(expiresIn: string) {
  const seconds = Number(expiresIn);
  const safeSeconds = Number.isFinite(seconds) ? seconds : 3600;

  return Date.now() + safeSeconds * 1000;
}

function normalizeTier(value: unknown): UrologicsUser["tier"] {
  return value === "paid" || value === "free" || value === "guest" ? value : "guest";
}

function saveAuth(user: UrologicsUser) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
}

export function clearStoredAuth() {
  window.localStorage.removeItem(STORAGE_KEY);
}

export function getStoredAuth(): UrologicsUser | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as UrologicsUser;
    if (!parsed.idToken || !parsed.refreshToken || !parsed.email) return null;

    return parsed;
  } catch {
    return null;
  }
}

async function fetchUrologicsAccess(idToken: string): Promise<UrologicsAccessResponse | null> {
  try {
    const response = await fetch("/api/urologics/access", {
      headers: {
        Authorization: `Bearer ${idToken}`,
      },
    });

    if (!response.ok) return null;

    return (await response.json()) as UrologicsAccessResponse;
  } catch {
    return null;
  }
}

async function buildUserFromAuth(params: {
  uid: string;
  email: string;
  displayName?: string;
  idToken: string;
  refreshToken: string;
  expiresIn: string;
}): Promise<UrologicsUser> {
  const access = await fetchUrologicsAccess(params.idToken);
  const profile = access?.profile;
  const email = (profile?.email || params.email).trim().toLowerCase();
  const name = (profile?.name || params.displayName || getFallbackName(email)).trim();

  const user: UrologicsUser = {
    uid: profile?.uid || params.uid,
    email,
    name,
    tier: normalizeTier(access?.tier),
    idToken: params.idToken,
    refreshToken: params.refreshToken,
    expiresAt: toExpiresAt(params.expiresIn),
    profileImageUrl:
      typeof profile?.profileImageUrl === "string" && profile.profileImageUrl.trim()
        ? profile.profileImageUrl.trim()
        : null,
    activeCourseIds: Array.isArray(profile?.activeCourseIds) ? profile.activeCourseIds : [],
  };

  saveAuth(user);
  return user;
}

export async function signInWithEmailPassword(email: string, password: string) {
  const apiKey = requireFirebaseApiKey();
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        password,
        returnSecureToken: true,
      }),
    }
  );

  const payload = (await response.json()) as FirebasePasswordResponse & {
    error?: { message?: string };
  };

  if (!response.ok) {
    throw new Error(payload.error?.message || "Unable to sign in.");
  }

  return buildUserFromAuth({
    uid: payload.localId,
    email: payload.email || email,
    displayName: payload.displayName,
    idToken: payload.idToken,
    refreshToken: payload.refreshToken,
    expiresIn: payload.expiresIn,
  });
}

export async function refreshStoredAuth(user: UrologicsUser) {
  const apiKey = requireFirebaseApiKey();
  const response = await fetch(`https://securetoken.googleapis.com/v1/token?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: user.refreshToken,
    }),
  });

  const payload = (await response.json()) as FirebaseRefreshResponse & {
    error?: { message?: string };
  };

  if (!response.ok) {
    clearStoredAuth();
    throw new Error(payload.error?.message || "Session expired. Please sign in again.");
  }

  return buildUserFromAuth({
    uid: payload.user_id,
    email: user.email,
    displayName: user.name,
    idToken: payload.id_token,
    refreshToken: payload.refresh_token,
    expiresIn: payload.expires_in,
  });
}
