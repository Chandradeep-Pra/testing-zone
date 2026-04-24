"use client";

import Link from "next/link";

type UrologicsBrandProps = {
  product?: string;
  tag?: string;
  compact?: boolean;
  href?: string;
};

export default function UrologicsBrand({
  product = "AI Viva",
  tag = "Premium Urology Prep",
  compact = false,
  href = "/",
}: UrologicsBrandProps) {
  const content = (
    <div className="flex items-center gap-3">
      <div className="relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl border border-teal-300/25 bg-[linear-gradient(135deg,rgba(45,212,191,0.28),rgba(8,17,31,0.9))] text-sm font-semibold text-white shadow-[0_14px_30px_rgba(45,212,191,0.16)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.24),transparent_55%)]" />
        <span className="relative">U</span>
      </div>
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-[0.28em] text-teal-300/90">
          Urologics
        </div>
        <div className={`${compact ? "text-sm" : "text-base"} truncate font-semibold text-white`}>
          Urologics {product}
        </div>
        {!compact && (
          <div className="text-xs text-slate-400">
            {tag}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <Link href={href} className="inline-flex">
      {content}
    </Link>
  );
}
