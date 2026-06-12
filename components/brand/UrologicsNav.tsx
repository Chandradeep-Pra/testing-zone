"use client";

import Link from "next/link";

const NAV_ITEMS = [
  { href: "/", label: "Overview" },
  { href: "/courses", label: "Courses" },
  { href: "/ai-viva/cases", label: "AI Viva" },
  { href: "/mocks", label: "Mocks" },
];

export default function UrologicsNav({ current }: { current?: string }) {
  return (
    <nav className="flex flex-wrap items-center gap-2 rounded-full border border-[#0f7896]/12 bg-white px-2 py-2 shadow-[0_12px_30px_rgba(15,120,150,0.09)] backdrop-blur-xl">
      {NAV_ITEMS.map((item) => {
        const active = item.label === current;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`rounded-full px-4 py-2 text-sm transition ${
              active
                ? "bg-[#0f7896] text-white"
                : "text-[#071014]/65 hover:bg-cyan-50 hover:text-[#071014]"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
