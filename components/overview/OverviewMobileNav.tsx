"use client";

import { BookOpen, ClipboardList, House, Mic, Sparkles } from "lucide-react";
import Link from "next/link";
import { NAV_ITEMS } from "@/components/brand/UrologicsNav";

const icons = [House, BookOpen, Mic, ClipboardList, Sparkles];

export default function OverviewMobileNav() {
  return (
    <nav className="overview-bottom-nav md:hidden" aria-label="Main navigation">
      {NAV_ITEMS.map((item, index) => {
        const Icon = icons[index];
        const active = item.label === "Overview";
        return (
          <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined}>
            <span><Icon size={20} strokeWidth={active ? 2.4 : 1.8} aria-hidden="true" /></span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
