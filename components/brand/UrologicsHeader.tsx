"use client";

import { useEffect, useRef, useState } from "react";
import AuthStatus from "@/components/auth/AuthStatus";
import UrologicsBrand from "@/components/brand/UrologicsBrand";
import UrologicsNav, { NAV_ITEMS } from "@/components/brand/UrologicsNav";
import ThemeToggle from "@/components/theme/ThemeToggle";
import Link from "next/link";

type UrologicsHeaderProps = {
  current?: string;
  product?: string;
  tag?: string;
};

export default function UrologicsHeader({
  current,
  product = "Platform",
  tag = "AI Viva, Mocks, and Grand Mocks",
}: UrologicsHeaderProps) {
  const [showHeader, setShowHeader] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const lastScrollYRef = useRef(0);
  const tickingRef = useRef(false);

  useEffect(() => {
    function handleScroll() {
      if (tickingRef.current) return;

      tickingRef.current = true;
      window.requestAnimationFrame(() => {
        const currentScrollY = window.scrollY;
        const lastScrollY = lastScrollYRef.current;

        if (currentScrollY < 50) {
          setShowHeader(true);
        } else if (currentScrollY > lastScrollY) {
          setShowHeader(false);
        } else {
          setShowHeader(true);
        }

        lastScrollYRef.current = currentScrollY;
        tickingRef.current = false;
      });
    }

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      <header
        className={`fixed inset-x-0 top-2 z-50 mx-auto w-full max-w-7xl px-3 transition-all duration-500 ease-in-out sm:top-3 sm:px-6 ${
          showHeader || menuOpen ? "translate-y-0 opacity-100" : "-translate-y-[130%] opacity-0"
        }`}
      >
        <div className="urologics-header flex items-center justify-between gap-2 rounded-[28px] px-3 py-2.5 backdrop-blur-xl sm:gap-3 sm:rounded-full sm:px-5 sm:py-3 md:px-6">
          <UrologicsBrand product={product} tag={tag} />
          <div className="hidden w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center md:flex">
            <UrologicsNav current={current} />
            <div className="flex justify-end gap-2">
              <ThemeToggle />
              <AuthStatus />
            </div>
          </div>
          <button
            type="button"
            aria-label="Toggle navigation"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((current) => !current)}
            className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface-raised)] text-[var(--accent-strong)] shadow-[0_10px_24px_var(--shadow-soft)] sm:h-11 sm:w-11 md:hidden"
          >
            <span
              className={`absolute h-0.5 w-5 rounded-full bg-current transition ${
                menuOpen ? "translate-y-0 rotate-45" : "-translate-y-1.5"
              }`}
            />
            <span
              className={`absolute h-0.5 w-5 rounded-full bg-current transition ${
                menuOpen ? "opacity-0" : "opacity-100"
              }`}
            />
            <span
              className={`absolute h-0.5 w-5 rounded-full bg-current transition ${
                menuOpen ? "translate-y-0 -rotate-45" : "translate-y-1.5"
              }`}
            />
          </button>
        </div>

        <div
          className={`mt-2 rounded-[28px] border border-[var(--border)] bg-[var(--surface-raised)] shadow-[0_18px_46px_var(--shadow-soft)] transition-all duration-300 md:hidden ${
            menuOpen
              ? "max-h-[520px] overflow-visible opacity-100"
              : "max-h-0 overflow-hidden opacity-0"
          }`}
        >
          <div className="grid gap-2 p-3">
            {NAV_ITEMS.map((item) => {
              const active = item.label === current;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className={`rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                    active
                      ? "bg-[var(--accent)] text-[var(--accent-text)]"
                      : "text-[var(--text-secondary)] hover:bg-[var(--accent-soft)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
            <div className="mt-2 flex items-center justify-between gap-2 border-t border-[var(--border)] pt-3">
              <ThemeToggle />
              <AuthStatus />
            </div>
          </div>
        </div>
      </header>
      <div className="h-20 shrink-0 sm:h-24" aria-hidden="true" />
    </>
  );
}
