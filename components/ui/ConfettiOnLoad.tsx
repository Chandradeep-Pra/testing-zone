"use client";

import confetti from "canvas-confetti";
import { useEffect } from "react";

// Fires a one-time full-screen confetti burst on mount.
export default function ConfettiOnLoad() {
  useEffect(() => {
    const end = Date.now() + 2500;
    const colors = ["#2dd4bf", "#facc15", "#f472b6", "#60a5fa", "#a78bfa"];

    confetti({ particleCount: 150, spread: 100, origin: { y: 0.6 }, colors, zIndex: 120 });

    let frame = 0;
    const tick = () => {
      confetti({ particleCount: 4, angle: 60, spread: 60, origin: { x: 0, y: 0.7 }, colors, zIndex: 120 });
      confetti({ particleCount: 4, angle: 120, spread: 60, origin: { x: 1, y: 0.7 }, colors, zIndex: 120 });
      if (Date.now() < end) frame = requestAnimationFrame(tick);
    };
    tick();

    return () => {
      cancelAnimationFrame(frame);
      confetti.reset();
    };
  }, []);

  return null;
}
