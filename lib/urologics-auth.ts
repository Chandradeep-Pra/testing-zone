"use client";

import { appPath } from "@/lib/app-path";

const FIREBASE_API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const STORAGE_KEY = "urologics-testing-zone-auth";
const LOGOUT_FLAG_KEY = "urologics-auth-logged-out";
const REFRESH_MARGIN_MS = 60_000;
const pendingRestores = new Map<string, Promise<UrologicsUser>>();
let authVersion = 0;

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
  phone?: string | null;
  country?: string | null;
  medicalInstitution?: string | null;
};

type FirebasePasswordResponse = {
  localId: string;
  email?: string;
  displayName?: string;
  idToken: string;
  refreshToken: string;
  expiresIn: string;
};

type FirebaseUpdatePasswordResponse = {
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
    phone?: string | null;
    country?: string | null;
    medicalInstitution?: string | null;
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
  authVersion += 1;
  pendingRestores.clear();
  window.localStorage.removeItem(STORAGE_KEY);
  window.localStorage.setItem(LOGOUT_FLAG_KEY, "1");
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
    const response = await fetch(appPath("/api/urologics/access"), {
      headers: {
        Authorization: `Bearer ${idToken}`,
      },
    });

    if (!response.ok) {
      throw Object.assign(new Error("Unable to load account access. Please try again."), { status: response.status });
    }

    return (await response.json()) as UrologicsAccessResponse;
}

async function buildUserFromAuth(params: {
  uid: string;
  email: string;
  displayName?: string;
  idToken: string;
  refreshToken: string;
  expiresIn: string;
  version?: number;
  expiresAt?: number;
}): Promise<UrologicsUser> {
  const version = params.version ?? authVersion;
  const expiresAt = params.expiresAt ?? toExpiresAt(params.expiresIn);
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
    expiresAt,
    profileImageUrl:
      typeof profile?.profileImageUrl === "string" && profile.profileImageUrl.trim()
        ? profile.profileImageUrl.trim()
        : null,
    activeCourseIds: Array.isArray(profile?.activeCourseIds) ? profile.activeCourseIds : [],
    phone: typeof profile?.phone === "string" && profile.phone.trim() ? profile.phone.trim() : null,
    country: typeof profile?.country === "string" && profile.country.trim() ? profile.country.trim() : null,
    medicalInstitution:
      typeof profile?.medicalInstitution === "string" && profile.medicalInstitution.trim()
        ? profile.medicalInstitution.trim()
        : null,
  };

  if (version !== authVersion) throw new Error("Account changed while restoring the session.");
  saveAuth(user);
  return user;
}

export async function signInWithEmailPassword(email: string, password: string) {
  const version = ++authVersion;
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
    version,
    uid: payload.localId,
    email: payload.email || email,
    displayName: payload.displayName,
    idToken: payload.idToken,
    refreshToken: payload.refreshToken,
    expiresIn: payload.expiresIn,
  });
}

export function refreshStoredAuth(user: UrologicsUser): Promise<UrologicsUser> {
  const key = `${user.refreshToken}:${user.idToken}`;
  const pending = pendingRestores.get(key);
  if (pending) return pending;
  const request = restoreStoredAuth(user, authVersion).finally(() => {
    if (pendingRestores.get(key) === request) pendingRestores.delete(key);
  });
  pendingRestores.set(key, request);
  return request;
}

async function restoreStoredAuth(user: UrologicsUser, version: number) {
  if (user.expiresAt > Date.now() + REFRESH_MARGIN_MS) {
    try {
      return await buildUserFromAuth({
        uid: user.uid,
        email: user.email,
        displayName: user.name,
        idToken: user.idToken,
        refreshToken: user.refreshToken,
        expiresIn: String(Math.max(0, (user.expiresAt - Date.now()) / 1000)),
        expiresAt: user.expiresAt,
        version,
      });
    } catch (error) {
      if ((error as { status?: number }).status !== 401) throw error;
    }
  }
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
    if (version === authVersion && (response.status === 400 || response.status === 401)) clearStoredAuth();
    throw new Error(payload.error?.message || "Session expired. Please sign in again.");
  }

  return buildUserFromAuth({
    version,
    uid: payload.user_id,
    email: user.email,
    displayName: user.name,
    idToken: payload.id_token,
    refreshToken: payload.refresh_token,
    expiresIn: payload.expires_in,
  });
}

export async function updateAccountPassword(user: UrologicsUser, password: string) {
  const apiKey = requireFirebaseApiKey();
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:update?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        idToken: user.idToken,
        password,
        returnSecureToken: true,
      }),
    }
  );

  const payload = (await response.json()) as FirebaseUpdatePasswordResponse & {
    error?: { message?: string };
  };

  if (!response.ok) {
    throw new Error(payload.error?.message || "Unable to set password.");
  }

  return buildUserFromAuth({
    uid: payload.localId || user.uid,
    email: payload.email || user.email,
    displayName: payload.displayName || user.name,
    idToken: payload.idToken,
    refreshToken: payload.refreshToken,
    expiresIn: payload.expiresIn,
  });
}
