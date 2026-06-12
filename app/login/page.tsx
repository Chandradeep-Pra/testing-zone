"use client";

import { FormEvent, useEffect, useState } from "react";
import { ArrowRight, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

import { useAuth } from "@/components/auth/AuthProvider";
import UrologicsBrand from "@/components/brand/UrologicsBrand";

function getReadableAuthError(message: string) {
  if (message.includes("INVALID_LOGIN_CREDENTIALS")) {
    return "Invalid email or password.";
  }

  if (message.includes("TOO_MANY_ATTEMPTS_TRY_LATER")) {
    return "Too many attempts. Please try again later.";
  }

  if (message.includes("Missing NEXT_PUBLIC_FIREBASE_API_KEY")) {
    return "Firebase login key is missing in testing-zone environment.";
  }

  return message || "Unable to sign in.";
}

export default function LoginPage() {
  const router = useRouter();
  const { user, loading, signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      router.replace("/");
    }
  }, [loading, router, user]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!email.trim() || !password) {
      toast.error("Please enter your email and password.");
      return;
    }

    setSubmitting(true);
    try {
      const signedInUser = await signIn(email, password);
      toast.success(`Welcome ${signedInUser.name}`);
      router.replace("/");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to sign in.";
      toast.error(getReadableAuthError(message));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="urologics-shell min-h-screen overflow-hidden px-4 py-5 sm:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-40px)] w-full max-w-6xl flex-col">
        <header className="urologics-header flex items-center justify-between px-5 py-4">
          <UrologicsBrand product="Login" tag="Secure learner access" />
        </header>

        <section className="grid flex-1 items-center gap-8 py-10 lg:grid-cols-[1fr_0.92fr]">
          <div className="urologics-panel px-6 py-8 sm:px-9 sm:py-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#0f7896]/12 bg-cyan-50 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#0f7896]">
              <ShieldCheck className="h-4 w-4" />
              Urologics Access
            </div>

            <h1 className="mt-7 max-w-2xl text-3xl font-semibold tracking-[-0.04em] text-[#071014] sm:text-5xl">
              Sign in to continue your viva and mock preparation.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-8 text-[#071014]/65">
              Use the same Urologics account connected with your course access. Your mock tests,
              AI viva access, and video content will be loaded from this account.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="urologics-panel p-5 sm:p-7">
            <div>
              <h2 className="text-2xl font-semibold tracking-[-0.03em] text-[#071014]">
                Login
              </h2>
              <p className="mt-2 text-sm leading-6 text-[#071014]/60">
                We will show your name after login, then connect your accessible content.
              </p>
            </div>

            <div className="mt-7 space-y-4">
              <label className="block">
                <span className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#071014]/70">
                  <Mail className="h-4 w-4 text-[#0f7896]" />
                  Email
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  className="urologics-input"
                  autoComplete="email"
                />
              </label>

              <label className="block">
                <span className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#071014]/70">
                  <LockKeyhole className="h-4 w-4 text-[#0f7896]" />
                  Password
                </span>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter password"
                  className="urologics-input"
                  autoComplete="current-password"
                />
              </label>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="urologics-button-primary mt-7 w-full gap-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Signing in..." : "Sign in"}
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
