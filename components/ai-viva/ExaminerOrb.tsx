"use client";

import { useCallback, useState } from "react";
import { ThinkingOrb, type OrbState } from "thinking-orbs";

export default function ExaminerOrb({ state, label }: { state: OrbState; label: string }) {
  const [color, setColor] = useState("#018888");
  const readAccent = useCallback((element: HTMLDivElement | null) => {
    if (element) {
      const accent = getComputedStyle(element).getPropertyValue("--accent").trim();
      setColor(accent || "#018888");
    }
  }, []);

  return (
    <div ref={readAccent} className="h-40 w-40 sm:h-48 sm:w-48" data-examiner-orb={state}>
      <ThinkingOrb
        state={state}
        size={64}
        theme="dark"
        color={color}
        aria-label={label}
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  );
}
