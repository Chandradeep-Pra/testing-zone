"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  clearStoredAuth,
  getStoredAuth,
  refreshStoredAuth,
  signInWithEmailPassword,
  type UrologicsUser,
} from "@/lib/urologics-auth";
import { appPath } from "@/lib/app-path";

const UROLOGICS_HOME_URL = "https://urologics.co.uk";

type AuthContextValue = {
  user: UrologicsUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<UrologicsUser>;
  refreshUser: () => Promise<UrologicsUser | null>;
  signOut: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UrologicsUser | null>(null);
  const [loading, setLoading] = useState(true);

  const syncPlaybackSession = useCallback(async (idToken: string) => {
    const response = await fetch(appPath("/api/urologics/session"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    });
    if (!response.ok) throw new Error("Playback session synchronization failed.");
  }, []);

  useEffect(() => {
    let active = true;

    async function restoreSession() {
      const stored = getStoredAuth();

      if (!stored) {
        if (active) setLoading(false);
        return;
      }

      try {
        const nextUser = await refreshStoredAuth(stored);
        if (active) {
          setUser(nextUser);
          void syncPlaybackSession(nextUser.idToken).catch(() => console.warn("Playback session synchronization failed."));
        }
      } catch {
        if (active) setUser(null);
      } finally {
        if (active) setLoading(false);
      }
    }

    void restoreSession();

    return () => {
      active = false;
    };
  }, [syncPlaybackSession]);

  const signIn = useCallback(async (email: string, password: string) => {
    const nextUser = await signInWithEmailPassword(email, password);
    await syncPlaybackSession(nextUser.idToken);
    setUser(nextUser);
    return nextUser;
  }, [syncPlaybackSession]);

  const refreshUser = useCallback(async () => {
    const stored = getStoredAuth();

    if (!stored) {
      setUser(null);
      return null;
    }

    const nextUser = await refreshStoredAuth(stored);
    await syncPlaybackSession(nextUser.idToken);
    setUser(nextUser);
    window.dispatchEvent(new Event("urologics:access-changed"));
    return nextUser;
  }, [syncPlaybackSession]);

  const signOut = useCallback(() => {
    window.dispatchEvent(new Event("urologics:logout"));
    void fetch(appPath("/api/urologics/session"), { method: "DELETE" });
    clearStoredAuth();
    setUser(null);
    window.location.assign(UROLOGICS_HOME_URL);
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      signIn,
      refreshUser,
      signOut,
    }),
    [loading, refreshUser, signIn, signOut, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
