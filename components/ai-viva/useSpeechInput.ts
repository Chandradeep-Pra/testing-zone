//@ts-nocheck
"use client";

import { useEffect, useRef } from "react";

export function useSpeechInput(
  onInterim: (t: string) => void,
  onFinal: (t: string) => void
) {
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const listeningRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

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
    rec.continuous = true;

    rec.onstart = () => {
      listeningRef.current = true;
      console.log("🎤 Mic started");
    };

    rec.onend = () => {
      listeningRef.current = false;
      console.log("🛑 Mic ended");
    };

    rec.onerror = (e: any) => {
      listeningRef.current = false;

      if (e.error === "aborted") {
        // benign — controlled lifecycle
        return;
      }

      console.error("Speech error:", e.error);
    };

    rec.onresult = (e: SpeechRecognitionEvent) => {
      let interim = "";
      let final = "";

      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        const text = res[0].transcript;

        if (res.isFinal) final += text;
        else interim += text;
      }

      if (interim) onInterim(interim.trim());
      if (final) onFinal(final.trim());
    };

    recognitionRef.current = rec;

    return () => {
      // ❌ DO NOT abort here
      recognitionRef.current = null;
    };
  }, [onInterim, onFinal]);

  function start() {
    const rec = recognitionRef.current;
    if (!rec || listeningRef.current) return;

    try {
      rec.start();
    } catch {
      // ignore
    }
  }

  function stop() {
    recognitionRef.current?.stop();
  }

  return {
    start,
    stop,
    isListening: () => listeningRef.current
  };
}
