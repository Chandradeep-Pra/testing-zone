"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, BookOpenCheck, Clock3, KeyRound, LogOut, ShieldCheck, TrendingUp, UserRound } from "lucide-react";
import toast from "react-hot-toast";
import Link from "next/link";

import { useAuth } from "@/components/auth/AuthProvider";
import UrologicsHeader from "@/components/brand/UrologicsHeader";
import { appPath } from "@/lib/app-path";

type AccessPayload = {
  tier?: string;
  profile?: {
    name?: string | null;
    email?: string | null;
    activeCourseIds?: string[];
    activePlanStatus?: string | null;
    planExpiresAt?: string | null;
  };
  plan?: {
    title?: string;
    name?: string;
    categoryName?: string;
  } | null;
  entitlements?: {
    courseIds?: string[];
    videoIds?: string[];
    mockIds?: string[];
    vivaCaseIds?: string[];
  } | null;
  vivaCredit?: {
    totalMinutes: number;
    usedMinutes: number;
    remainingMinutes: number;
    percentRemaining: number;
  } | null;
};

type ProgressPayload = {
  stats?: Record<string, unknown>;
  summary?: {
    continueWatchingCount?: number;
    recentQuizCount?: number;
    recentMockCount?: number;
    recentVivaCount?: number;
  };
};

const FIREBASE_API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

function numberValue(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export default function UserPage() {
  const { user, loading, signOut } = useAuth();
  const [access, setAccess] = useState<AccessPayload | null>(null);
  const [progress, setProgress] = useState<ProgressPayload | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    const idToken = user?.idToken;
    if (!idToken) {
      setPageLoading(false);
      return;
    }

    let active = true;

    async function loadUserData() {
      setPageLoading(true);

      try {
        const [accessResponse, progressResponse] = await Promise.all([
          fetch(appPath("/api/urologics/access"), {
            headers: { Authorization: `Bearer ${idToken}` },
            cache: "no-store",
          }),
          fetch(appPath("/api/urologics/me/progress"), {
            headers: { Authorization: `Bearer ${idToken}` },
            cache: "no-store",
          }),
        ]);

        const accessPayload = await accessResponse.json().catch(() => ({}));
        const progressPayload = await progressResponse.json().catch(() => ({}));

        if (!accessResponse.ok) throw new Error(accessPayload?.error || "Unable to load access.");
        if (!progressResponse.ok) throw new Error(progressPayload?.error || "Unable to load progress.");

        if (!active) return;
        setAccess(accessPayload);
        setProgress(progressPayload);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Unable to load profile.");
      } finally {
        if (active) setPageLoading(false);
      }
    }

    void loadUserData();

    return () => {
      active = false;
    };
  }, [user?.idToken]);

  const progressCards = useMemo(() => {
    const stats = progress?.stats || {};
    return [
      { label: "Videos watched", value: numberValue(stats.videosWatched || stats.videoCompletedCount) },
      { label: "Quiz attempts", value: numberValue(stats.quizAttempts || stats.quizzesAttempted) },
      { label: "Mock attempts", value: numberValue(stats.mockAttempts || stats.mocksAttempted) },
      { label: "Viva attempts", value: numberValue(stats.vivaAttempts || stats.vivasAttempted) },
    ];
  }, [progress?.stats]);

  async function sendPasswordReset() {
    if (!user?.email) {
      toast.error("No email found for this account.");
      return;
    }

    if (!FIREBASE_API_KEY) {
      toast.error("Password reset is not configured.");
      return;
    }

    try {
      setResetting(true);
      const response = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${FIREBASE_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            requestType: "PASSWORD_RESET",
            email: user.email,
          }),
        }
      );
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload?.error?.message || "Unable to send password reset email.");
      }

      toast.success("Password reset email sent.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to send password reset email.");
    } finally {
      setResetting(false);
    }
  }

  return (
    <main className="urologics-shell min-h-screen">
      <div className="mobile-native-page mx-auto min-h-screen w-full max-w-7xl sm:px-6 sm:py-4">
        <UrologicsHeader current="Profile" product="Profile" tag="Access, plans, and progress" />

        {loading || pageLoading ? (
          <section className="urologics-panel p-8 text-[var(--text-secondary)]">Loading your account...</section>
        ) : !user ? (
          <section className="urologics-panel p-8 text-center">
            <UserRound className="mx-auto h-12 w-12 text-[var(--accent-strong)]" />
            <h1 className="mt-4 text-2xl font-semibold text-[var(--text-primary)]">Login required</h1>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">Please login to view your account.</p>
            <Link href="/login" className="urologics-button-primary mt-5 inline-flex">
              Login
            </Link>
          </section>
        ) : (
          <section className="grid gap-4 pb-12 sm:gap-5 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="grid gap-4 sm:gap-5">
              <div className="urologics-panel p-5 sm:p-6">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="grid h-16 w-16 place-items-center overflow-hidden rounded-full bg-[var(--accent-soft)] text-[var(--accent-strong)]">
                    {user.profileImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={user.profileImageUrl} alt={user.name} className="h-full w-full object-cover" />
                    ) : (
                      <UserRound className="h-8 w-8" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xl font-semibold text-[var(--text-primary)] sm:text-2xl">{user.name}</p>
                    <p className="truncate text-sm text-[var(--text-secondary)]">{user.email}</p>
                  </div>
                </div>

                <div className="mt-5 grid gap-2 sm:mt-6 sm:grid-cols-2 sm:gap-3">
                  <button
                    type="button"
                    onClick={sendPasswordReset}
                    disabled={resetting}
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-raised)] px-4 py-3 text-sm font-semibold text-[var(--text-primary)] transition hover:bg-[var(--accent-soft)] disabled:cursor-wait disabled:opacity-70"
                  >
                    <KeyRound className="h-4 w-4" />
                    {resetting ? "Sending..." : "Password reset"}
                  </button>
                  <button
                    type="button"
                    onClick={signOut}
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-100"
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </button>
                </div>
              </div>

              <div className="urologics-panel p-5 sm:p-6">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="h-5 w-5 text-[var(--accent-strong)]" />
                  <h2 className="text-xl font-semibold text-[var(--text-primary)]">Access</h2>
                </div>
                <div className="mt-5 grid gap-3">
                  <InfoRow label="Tier" value={access?.tier || user.tier} />
                  <InfoRow label="Courses" value={`${access?.profile?.activeCourseIds?.length || 0} active`} />
                  <InfoRow label="Plan status" value={access?.profile?.activePlanStatus || "None"} />
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:gap-5">
              <div className="urologics-panel p-5 sm:p-6">
                <div className="flex items-center gap-3">
                  <BookOpenCheck className="h-5 w-5 text-[var(--accent-strong)]" />
                  <h2 className="text-xl font-semibold text-[var(--text-primary)]">Plan enrolled</h2>
                </div>
                <h3 className="mt-5 text-xl font-semibold text-[var(--text-primary)] sm:text-2xl">
                  {access?.plan?.title || access?.plan?.name || "No active plan"}
                </h3>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                  {access?.plan?.categoryName || "Course access can be assigned by the Urologics team."}
                </p>
                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <Metric label="Courses" value={access?.entitlements?.courseIds?.length || 0} />
                  <Metric label="Videos" value={access?.entitlements?.videoIds?.length || 0} />
                  <Metric label="Vivas" value={access?.entitlements?.vivaCaseIds?.length || 0} />
                </div>
              </div>

              <div className="urologics-panel p-5 sm:p-6">
                <div className="flex items-center gap-3">
                  <Clock3 className="h-5 w-5 text-[var(--accent-strong)]" />
                  <h2 className="text-xl font-semibold text-[var(--text-primary)]">AI Viva credits</h2>
                </div>
                <p className="mt-5 text-2xl font-semibold text-[var(--text-primary)] sm:text-3xl">
                  {access?.vivaCredit?.remainingMinutes ?? 0} minutes left
                </p>
                <div className="mt-4 h-3 overflow-hidden rounded-full bg-[var(--accent-soft)]">
                  <div
                    className="h-full rounded-full bg-[var(--accent)]"
                    style={{ width: `${Math.max(0, Math.min(100, access?.vivaCredit?.percentRemaining || 0))}%` }}
                  />
                </div>
              </div>

              <div className="urologics-panel p-5 sm:p-6">
                <div className="flex items-center gap-3">
                  <TrendingUp className="h-5 w-5 text-[var(--accent-strong)]" />
                  <h2 className="text-xl font-semibold text-[var(--text-primary)]">Progress report</h2>
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {progressCards.map((item) => (
                    <Metric key={item.label} label={item.label} value={item.value} />
                  ))}
                </div>
                <Link href="/courses" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[var(--accent-strong)]">
                  Continue learning
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-[var(--surface-muted)] px-4 py-3">
      <span className="text-sm text-[var(--text-secondary)]">{label}</span>
      <span className="text-sm font-semibold text-[var(--text-primary)]">{value}</span>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <p className="text-2xl font-semibold text-[var(--text-primary)]">{value}</p>
      <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">{label}</p>
    </div>
  );
}
