"use client";

import { useEffect, useRef } from "react";
import SiriWave from "siriwave";

type Props = {
  amplitude: number;
  speed?: number;
};

export default function SiriWaveComponent({
  amplitude,
  speed = 0.08,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const waveRef = useRef<any>(null);

  // init wave
  useEffect(() => {
    if (!containerRef.current) return;

    const wave = new SiriWave({
      container: containerRef.current,
      width: 520,          // wider = more presence
      height: 220,         // taller = thicker wave
      style: "ios",        // ✅ most rounded available
      speed,
      amplitude: 1,
      autostart: true,
      color: "#34d399",
    });

    waveRef.current = wave;

    return () => {
      wave.dispose();
    };
  }, []);

  // update amplitude (reactivity fix)
  useEffect(() => {
    if (!waveRef.current) return;

    // 🔥 boost + clamp (VERY IMPORTANT)
    const boosted = Math.min(1, amplitude * 3);

    waveRef.current.setAmplitude(boosted);
  }, [amplitude]);

  return (
    <div
      ref={containerRef}
      className="scale-125 origin-center"
    />
  );
}