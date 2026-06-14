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
    <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
      <Image
        src={appPath("/logo.png")}
        alt="Urologics"
        width={44}
        height={44}
        className="h-10 w-10 shrink-0 object-contain sm:h-11 sm:w-11"
      />
      <div className="min-w-0">
        {/* <div className="text-[10px] uppercase tracking-[0.28em] text-teal-300/90">
          Urologics
        </div> */}
        <div className={`${compact ? "text-sm" : "text-sm sm:text-base"} truncate font-semibold text-[var(--text-primary)]`}>
          Urologics {product}
        </div>
        {!compact && (
          <div className="hidden text-xs text-[var(--text-secondary)] sm:block">
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
