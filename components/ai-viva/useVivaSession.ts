"use client"

import { useRef } from "react";

export function useVivaSession() {
  const sessionIdRef = useRef(crypto.randomUUID());

  async function next(userAnswer: string) {
    const res = await fetch("/api/viva/next", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: sessionIdRef.current,
        userAnswer,
        timeElapsedSec: 0
      })
    });

    return res.json();
  }

  return { next };
}
