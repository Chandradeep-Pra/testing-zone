"use client";

import { Mic } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type MicLevelMeterProps = {
  level?: number;
  active?: boolean;
  label?: string;
  helper?: string;
  selfTest?: boolean;
};

function normalizeLevel(value: number) {
  return Math.max(0, Math.min(1, value));
}

export default function MicLevelMeter({
  level,
  active = true,
  label = "Mic level",
  helper,
  selfTest = false,
}: MicLevelMeterProps) {
  const [selfLevel, setSelfLevel] = useState(0);
  const animationRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  useEffect(() => {
    if (!selfTest || !active) {
      return;
    }

    let cancelled = false;

    async function startMeter() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        const audioContext = new AudioContext();
        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        const data = new Uint8Array(analyser.fftSize);

        analyser.fftSize = 512;
        source.connect(analyser);

        streamRef.current = stream;
        audioContextRef.current = audioContext;
        sourceRef.current = source;
        analyserRef.current = analyser;

        const tick = () => {
          analyser.getByteTimeDomainData(data);
          let sum = 0;

          for (let index = 0; index < data.length; index += 1) {
            const centered = (data[index] - 128) / 128;
            sum += centered * centered;
          }

          const rms = Math.sqrt(sum / data.length);
          setSelfLevel(normalizeLevel(rms * 4.5));
          animationRef.current = window.requestAnimationFrame(tick);
        };

        tick();
      } catch {
        setSelfLevel(0);
      }
    }

    void startMeter();

    return () => {
      cancelled = true;

      if (animationRef.current) {
        window.cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }

      sourceRef.current?.disconnect();
      sourceRef.current = null;
      analyserRef.current = null;

      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;

      if (audioContextRef.current) {
        void audioContextRef.current.close();
        audioContextRef.current = null;
      }
    };
  }, [active, selfTest]);

  const visibleLevel = normalizeLevel(selfTest ? (active ? selfLevel : 0) : level ?? 0);
  const bars = Array.from({ length: 18 }, (_, index) => {
    const threshold = (index + 1) / 18;
    return visibleLevel >= threshold;
  });
  const speaking = visibleLevel > 0.08;

  return (
    <div className="rounded-2xl border border-[#0f7896]/12 bg-white px-4 py-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-[#071014]">
          <Mic size={16} className="text-[#0f7896]" />
          {label}
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${
            speaking ? "bg-cyan-50 text-[#0f7896]" : "bg-slate-100 text-slate-500"
          }`}
        >
          {speaking ? "Speaking" : "Silent"}
        </span>
      </div>

      <div className="flex h-8 items-end gap-1">
        {bars.map((filled, index) => (
          <span
            key={index}
            className={`flex-1 rounded-full transition-all duration-100 ${
              filled ? "bg-[#0f7896]" : "bg-[#0f7896]/12"
            }`}
            style={{ height: `${28 + ((index % 6) + 1) * 10}%` }}
          />
        ))}
      </div>

      {helper ? <p className="mt-3 text-xs leading-5 text-[#071014]/60">{helper}</p> : null}
    </div>
  );
}
