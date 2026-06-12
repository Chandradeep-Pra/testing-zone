"use client";

import Image from "next/image";
import Link from "next/link";

import { appPath } from "@/lib/app-path";

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
      <Image
        src={appPath("/logo.png")}
        alt="Urologics"
        width={44}
        height={44}
        className="h-11 w-11 object-contain"
      />
      <div className="min-w-0">
        {/* <div className="text-[10px] uppercase tracking-[0.28em] text-teal-300/90">
          Urologics
        </div> */}
        <div className={`${compact ? "text-sm" : "text-base"} truncate font-semibold text-[var(--text-primary)]`}>
          Urologics {product}
        </div>
        {!compact && (
          <div className="text-xs text-[var(--text-secondary)]">
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
