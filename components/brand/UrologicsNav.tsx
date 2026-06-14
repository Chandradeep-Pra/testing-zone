"use client";

import Link from "next/link";

export const NAV_ITEMS = [
  { href: "/", label: "Overview" },
  { href: "/courses", label: "Courses" },
  { href: "/ai-viva/cases", label: "AI Viva" },
  { href: "/mocks", label: "Mocks" },
];

export default function UrologicsNav({ current }: { current?: string }) {
  return (
    <nav className="flex flex-wrap items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-raised)] px-2 py-2 shadow-[0_12px_30px_var(--shadow-soft)] backdrop-blur-xl">
      {NAV_ITEMS.map((item) => {
        const active = item.label === current;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`rounded-full px-4 py-2 text-sm transition ${
              active
                ? "bg-[var(--accent)] text-[var(--accent-text)]"
                : "text-[var(--text-secondary)] hover:bg-[var(--accent-soft)] hover:text-[var(--text-primary)]"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
