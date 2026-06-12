"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import VivaSessionClient from "@/components/ai-viva/VivaSessionClient";
import { useAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import { appPath } from "@/lib/app-path";
import type { VivaCaseRecord } from "@/lib/viva-case";

type VivaCaseWithAccess = VivaCaseRecord & {
  access?: {
    allowed?: boolean;
    reason?: string | null;
  };
};

export default function AuthenticatedVivaSessionLoader({ id }: { id: string }) {
  const { user, loading: authLoading } = useAuth();
  const [vivaCase, setVivaCase] = useState<VivaCaseWithAccess | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadCase() {
      if (authLoading) return;

      setLoading(true);
      setError("");

      try {
        const response = user?.idToken
          ? await fetch(appPath("/api/urologics/viva-cases"), {
              headers: {
                Authorization: `Bearer ${user.idToken}`,
              },
              cache: "no-store",
            })
          : await fetch(appPath(`/api/public/viva-cases/${encodeURIComponent(id)}`), {
              cache: "no-store",
            });

        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(payload?.error || "Unable to load this viva case.");
        }

        const nextCase = user?.idToken
          ? (payload?.cases || []).find((item: VivaCaseWithAccess) => item.id === id)
          : payload?.case;

        if (!active) return;

        if (!nextCase) {
          setError("This viva case is not available for your account.");
          setVivaCase(null);
          return;
        }

        if (nextCase.access && nextCase.access.allowed === false) {
          setError(nextCase.access.reason || "You do not have access to this viva case.");
          setVivaCase(null);
          return;
        }

        setVivaCase(nextCase);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Unable to load this viva case.");
        setVivaCase(null);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadCase();

    return () => {
      active = false;
    };
  }, [authLoading, id, user?.idToken]);

  if (loading || authLoading) {
    return (
      <main className="urologics-shell flex min-h-screen items-center justify-center">
        <div className="urologics-panel px-8 py-6 text-[var(--text-secondary)]">
          Loading Urologics AI Viva...
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="urologics-shell flex min-h-screen items-center justify-center px-4">
        <section className="urologics-panel w-full max-w-md p-8 text-center">
          <img
            src={appPath("/logo.png")}
            alt="Urologics"
            className="mx-auto mb-5 h-16 w-16 object-contain"
          />
          <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Login required</h1>
          <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
            Please login to access this AI Viva session.
          </p>
          <Button asChild className="mt-6 rounded-full bg-[#0f7896] text-white hover:bg-[#0b6078]">
            <Link href="/login">Login</Link>
          </Button>
        </section>
      </main>
    );
  }

  if (error || !vivaCase) {
    return (
      <main className="urologics-shell flex min-h-screen items-center justify-center px-4">
        <section className="urologics-panel w-full max-w-md p-8 text-center">
          <img
            src={appPath("/logo.png")}
            alt="Urologics"
            className="mx-auto mb-5 h-16 w-16 object-contain"
          />
          <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Viva unavailable</h1>
          <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
            {error || "This viva case is not available for your account."}
          </p>
          <Button asChild className="mt-6 rounded-full bg-[#0f7896] text-white hover:bg-[#0b6078]">
            <Link href="/ai-viva/cases">Back to AI Viva cases</Link>
          </Button>
        </section>
      </main>
    );
  }

  return <VivaSessionClient vivaCase={vivaCase} />;
}
