"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { LogOut, UserRound } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import GlobalLoading from "@/components/ui/GlobalLoading";

export default function AuthStatus() {
  const { user, loading, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  if (loading) {
    return (
      <span className="inline-flex rounded-full border border-[var(--border)] bg-[var(--accent-soft)] px-4 py-2">
        <GlobalLoading label="" compact className="min-w-16" />
      </span>
    );
  }

  if (!user) {
    return (
      <Link
        href="/login"
        className="rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--accent-text)] transition hover:bg-[var(--accent-hover)]"
      >
        Login
      </Link>
    );
  }

  return (
    <div ref={menuRef} className="relative flex items-center gap-3">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="grid h-11 w-11 place-items-center overflow-hidden rounded-full border border-[var(--border)] bg-[var(--accent-soft)] text-[var(--accent-strong)] shadow-[0_10px_28px_var(--shadow-soft)] transition hover:border-[var(--accent)]"
        aria-label="Open account menu"
      >
        {user.profileImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.profileImageUrl} alt={user.name} className="h-full w-full object-cover" />
        ) : (
          <UserRound className="h-5 w-5" />
        )}
      </button>

      {open ? (
        <div className="absolute right-0 top-[calc(100%+10px)] z-50 w-56 rounded-[22px] border border-[var(--border)] bg-[var(--surface-raised)] p-2 shadow-[0_20px_50px_var(--shadow-brand)]">
          <div className="px-3 py-2">
            <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{user.name}</p>
            <p className="truncate text-xs text-[var(--text-tertiary)]">{user.email}</p>
          </div>
          <Link
            href="/user"
            onClick={() => setOpen(false)}
            className="mt-1 flex w-full items-center gap-2 rounded-2xl px-3 py-2 text-sm font-semibold text-[var(--text-primary)] transition hover:bg-[var(--accent-soft)] hover:text-[var(--accent-strong)]"
          >
            <UserRound className="h-4 w-4" />
            My account
          </Link>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              signOut();
            }}
            className="mt-1 flex w-full items-center gap-2 rounded-2xl px-3 py-2 text-sm font-semibold text-[var(--text-primary)] transition hover:bg-[var(--accent-soft)] hover:text-[var(--accent-strong)]"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      ) : null}
    </div>
  );
}
