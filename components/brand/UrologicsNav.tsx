"use client";

import Link from "next/link";

const NAV_ITEMS = [
  { href: "/", label: "Overview" },
  { href: "/ai-viva/cases", label: "AI Viva" },
  { href: "/mocks", label: "Mocks" },
];

export default function UrologicsNav({ current }: { current?: string }) {
  return (
    <nav className="flex flex-wrap items-center gap-2 rounded-full border border-[#202430] bg-[#090d15] px-2 py-2 shadow-[0_10px_24px_rgba(2,6,23,0.42)] backdrop-blur-xl">
      {NAV_ITEMS.map((item) => {
        const active = item.label === current;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`rounded-full px-4 py-2 text-sm transition ${
              active
                ? "bg-[#171d2a] text-white"
                : "text-slate-300 hover:bg-[#111723] hover:text-white"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
