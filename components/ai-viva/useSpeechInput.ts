"use client";

import { useEffect, useRef } from "react";

export function useSpeechInput(
  onInterim: (t: string) => void,
  onFinal: (t: string) => void
) {
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const activeRef = useRef(false);

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn("SpeechRecognition not supported");
      return;
    }

    const rec: SpeechRecognition = new SpeechRecognition();
    rec.lang = "en-US";
    rec.interimResults = true;
    rec.continuous = false; // 🚨 IMPORTANT

    rec.onstart = () => {
      activeRef.current = true;
      console.log("🎤 Mic started");
    };

    rec.onend = () => {
      activeRef.current = false;
      console.log("🛑 Mic stopped");
    };

    rec.onerror = (e: any) => {
      activeRef.current = false;
      console.error("Speech error:", e.error);
      // ❌ DO NOT restart here
    };

    rec.onresult = (e: SpeechRecognitionEvent) => {
      let interim = "";
      let final = "";

      for (let i = e.resultIndex; i < e.results.length; i++) {
        const text = e.results[i][0].transcript;
        if (e.results[i].isFinal) final += text;
        else interim += text;
      }

      if (interim) onInterim(interim);

      if (final) {
        onFinal(final.trim());
        rec.stop(); // user finished speaking
      }
    };

    recognitionRef.current = rec;

    return () => {
      rec.abort();
    };
  }, [onInterim, onFinal]);

  function start() {
    if (!recognitionRef.current) return;
    if (activeRef.current) return;

    try {
      recognitionRef.current.start();
    } catch {
      // Chrome throws if start() called twice
    }
  }

  function stop() {
    recognitionRef.current?.stop();
  }

  return { start, stop };
}
