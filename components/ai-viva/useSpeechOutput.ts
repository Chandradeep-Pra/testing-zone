"use client";

import { useEffect, useRef, useState } from "react";
import { appPath } from "@/lib/app-path";
import type { MedicalTerm } from "@/lib/medical-terminology";

type SpeechOptions = {
  voiceName?: string;
  languageCode?: string;
  terminology?: MedicalTerm[];
};

export function useSpeechOutput() {
  const [amplitude, setAmplitude] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const requestRef = useRef<AbortController | null>(null);
  const generationRef = useRef(0);

  function stop() {
    generationRef.current += 1;
    requestRef.current?.abort();
    requestRef.current = null;
    cleanupRef.current?.();
    cleanupRef.current = null;
    audioRef.current = null;
    setAmplitude(0);
  }

  useEffect(() => () => {
    stop();
    void contextRef.current?.close();
    contextRef.current = null;
  }, []);

  // Resolves when playback STARTS. Completion still uses onEnd, so callers can
  // dismiss preparation UI without waiting for the entire question to finish.
  async function speak(text: string, onEnd?: () => void, options?: SpeechOptions) {
    stop();
    setError(null);
    const generation = generationRef.current;
    const controller = new AbortController();
    requestRef.current = controller;
    const requestTimeout = setTimeout(() => controller.abort(), 30_000);
    try {
      const res = await fetch(appPath("/api/viva/tts"), {
        method: "POST",
        signal: controller.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, ...options }),
      });
      if (!res.ok) throw new Error("Unable to prepare examiner audio. Please retry.");
      const blob = await res.blob();
      clearTimeout(requestTimeout);
      if (!blob.size) throw new Error("The examiner audio was empty. Please retry.");
      if (generation !== generationRef.current) throw new Error("Playback cancelled");
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      let frame = 0;
      let source: MediaElementAudioSourceNode | null = null;
      let playbackTimeout: ReturnType<typeof setTimeout> | undefined;
      let rejectStart: ((error: Error) => void) | undefined;
      const cleanup = () => {
        if (playbackTimeout) clearTimeout(playbackTimeout);
        cancelAnimationFrame(frame);
        audio.onplay = null;
        audio.onended = null;
        audio.onerror = null;
        audio.pause();
        audio.removeAttribute("src");
        source?.disconnect();
        URL.revokeObjectURL(url);
        rejectStart?.(new Error("Playback cancelled"));
        rejectStart = undefined;
      };
      cleanupRef.current = cleanup;
      // The waveform is optional. An unavailable/suspended analyser must not
      // prevent the browser audio element from playing the question.
      try {
        contextRef.current ||= new AudioContext();
        const context = contextRef.current;
        if (context.state === "suspended") void context.resume().catch(() => {});
        source = context.createMediaElementSource(audio);
        const analyser = context.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        analyser.connect(context.destination);
        const data = new Uint8Array(analyser.frequencyBinCount);
        const tick = () => {
          if (generation !== generationRef.current || audio.paused) return;
          analyser.getByteFrequencyData(data);
          setAmplitude(data.reduce((sum, value) => sum + value, 0) / data.length / 255);
          frame = requestAnimationFrame(tick);
        };
        audio.onplay = tick;
      } catch {
        // Native element playback is still available without a waveform.
      }
      audio.onended = () => {
        if (generation !== generationRef.current) return;
        cleanup();
        cleanupRef.current = null;
        audioRef.current = null;
        setAmplitude(0);
        onEnd?.();
      };
      audio.onerror = () => {
        if (generation !== generationRef.current) return;
        const message = "Examiner audio could not play. Please retry.";
        setError(message);
        rejectStart?.(new Error(message));
        rejectStart = undefined;
        cleanup();
        cleanupRef.current = null;
        setAmplitude(0);
      };
      await new Promise<void>((resolve, reject) => {
        rejectStart = reject;
        playbackTimeout = setTimeout(() => reject(new Error("Audio playback timed out. Please retry.")), 15_000);
        audio.play().then(() => {
          clearTimeout(playbackTimeout);
          rejectStart = undefined;
          resolve();
        }, reject);
      });
    } catch (cause) {
      if (generation === generationRef.current) {
        cleanupRef.current?.();
        cleanupRef.current = null;
        setError(controller.signal.aborted
          ? "Preparing examiner audio timed out. Please retry."
          : cause instanceof Error ? cause.message : "Unable to play examiner audio.");
      }
      throw cause;
    } finally {
      clearTimeout(requestTimeout);
      if (requestRef.current === controller) requestRef.current = null;
    }
  }

  return { speak, amplitude, error, stop };
}
