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

type AuthContextValue = {
  user: UrologicsUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<UrologicsUser>;
  signOut: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UrologicsUser | null>(null);
  const [loading, setLoading] = useState(true);

  const syncPlaybackSession = useCallback(async (idToken: string) => {
    await fetch(appPath("/api/urologics/session"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    }).catch(() => undefined);
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
        const expiresSoon = stored.expiresAt - Date.now() < 5 * 60 * 1000;
        const nextUser = expiresSoon ? await refreshStoredAuth(stored) : stored;
        await syncPlaybackSession(nextUser.idToken);
        if (active) setUser(nextUser);
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

  const signOut = useCallback(() => {
    void fetch(appPath("/api/urologics/session"), { method: "DELETE" });
    clearStoredAuth();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      signIn,
      signOut,
    }),
    [loading, signIn, signOut, user]
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
