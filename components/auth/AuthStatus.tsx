"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { LogOut, UserRound } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";

function getFirstName(name: string) {
  return name.trim().split(/\s+/)[0] || "there";
}

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
      <span className="rounded-full border border-[#0f7896]/12 bg-cyan-50 px-4 py-2 text-sm font-medium text-[#0f7896]">
        Checking session
      </span>
    );
  }

  if (!user) {
    return (
      <Link
        href="/login"
        className="rounded-full bg-[#0f7896] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0b6078]"
      >
        Login
      </Link>
    );
  }

  const firstName = getFirstName(user.name || user.email);

  return (
    <div ref={menuRef} className="relative flex items-center gap-3">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="grid h-11 w-11 place-items-center overflow-hidden rounded-full border border-[#0f7896]/12 bg-cyan-50 text-[#0f7896] shadow-[0_10px_28px_rgba(15,120,150,0.08)] transition hover:border-[#0f7896]/30"
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
        <div className="absolute right-0 top-[calc(100%+10px)] z-50 w-56 rounded-[22px] border border-[#0f7896]/12 bg-white p-2 shadow-[0_20px_50px_rgba(15,120,150,0.16)]">
          <div className="px-3 py-2">
            <p className="truncate text-sm font-semibold text-[#071014]">{user.name}</p>
            <p className="truncate text-xs text-[#071014]/55">{user.email}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              signOut();
            }}
            className="mt-1 flex w-full items-center gap-2 rounded-2xl px-3 py-2 text-sm font-semibold text-[#071014] transition hover:bg-cyan-50 hover:text-[#0f7896]"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      ) : null}
    </div>
  );
}
