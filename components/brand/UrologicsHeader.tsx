"use client";

import { useEffect, useRef, useState } from "react";
import AuthStatus from "@/components/auth/AuthStatus";
import UrologicsBrand from "@/components/brand/UrologicsBrand";
import UrologicsNav from "@/components/brand/UrologicsNav";

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
        className={`fixed inset-x-0 top-3 z-50 mx-auto w-full max-w-7xl px-4 transition-all duration-500 ease-in-out sm:px-6 ${
          showHeader ? "translate-y-0 opacity-100" : "-translate-y-[130%] opacity-0"
        }`}
      >
        <div className="urologics-header flex flex-col items-start gap-4 px-4 py-4 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between sm:px-5 md:px-6">
          <UrologicsBrand product={product} tag={tag} />
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
            <UrologicsNav current={current} />
            <div className="flex justify-end">
              <AuthStatus />
            </div>
          </div>
        </div>
      </header>
      <div className="h-36 shrink-0 sm:h-24" aria-hidden="true" />
    </>
  );
}
