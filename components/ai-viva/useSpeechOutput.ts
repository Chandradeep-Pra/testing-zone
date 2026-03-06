"use client";

import { useRef, useState } from "react";

export function useSpeechOutput() {

  const [amplitude, setAmplitude] = useState(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  async function speak(text: string, onEnd?: () => void) {

    const res = await fetch("/api/viva/tts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text }),
    });

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);

    const audio = new Audio(url);
    audioRef.current = audio;

    const audioContext = new AudioContext();
    const source = audioContext.createMediaElementSource(audio);

    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;

    source.connect(analyser);
    analyser.connect(audioContext.destination);

    const data = new Uint8Array(analyser.frequencyBinCount);

    function tick() {
      analyser.getByteFrequencyData(data);

      const avg =
        data.reduce((a, b) => a + b, 0) / data.length;

      setAmplitude(avg / 255);

      if (!audio.paused) {
        requestAnimationFrame(tick);
      }
    }

    audio.onplay = () => {
      tick();
    };

    audio.onended = () => {
      setAmplitude(0);
      onEnd?.();
      URL.revokeObjectURL(url);
    };

    await audio.play();
  }

  return { speak, amplitude };
}