"use client";

import { useEffect, useState } from "react";

const MESSAGES = ["Reviewing your test...", "Generating score...", "Getting your rank..."];

export default function ResultsLoader() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setIndex((value) => (value + 1) % MESSAGES.length), 1500);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-6 bg-slate-950/95 px-4 backdrop-blur-xl">
      <div className="h-14 w-14 animate-spin rounded-full border-4 border-teal-300/30 border-t-teal-300" />
      <p key={index} className="animate-pulse text-xl font-semibold text-teal-300 sm:text-2xl">
        {MESSAGES[index]}
      </p>
    </div>
  );
}
