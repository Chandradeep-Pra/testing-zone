"use client";

import { Mic } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type MicLevelMeterProps = {
  level?: number;
  active?: boolean;
  label?: string;
  helper?: string;
  selfTest?: boolean;
  deviceId?: string;
  onVoiceDetected?: () => void;
};

function normalizeLevel(value: number) {
  return Math.max(0, Math.min(1, value));
}

function rmsToVoiceLevel(rms: number) {
  if (rms <= 0.00001) return 0;

  const db = 20 * Math.log10(rms);
  const minDb = -58;
  const maxDb = -18;

  return normalizeLevel((db - minDb) / (maxDb - minDb));
}

export default function MicLevelMeter({
  level,
  active = true,
  label = "Mic level",
  helper,
  selfTest = false,
  deviceId,
  onVoiceDetected,
}: MicLevelMeterProps) {
  const [selfLevel, setSelfLevel] = useState(0);
  const animationRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const onVoiceDetectedRef = useRef(onVoiceDetected);
  const hasDetectedVoiceRef = useRef(false);
  onVoiceDetectedRef.current = onVoiceDetected;

  useEffect(() => {
    if (!selfTest || !active) {
      return;
    }

    let cancelled = false;
    let smoothedLevel = 0;
    hasDetectedVoiceRef.current = false;

    async function startMeter() {
      try {
        let stream: MediaStream;

        try {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: deviceId
              ? {
                  deviceId: { exact: deviceId },
                  echoCancellation: true,
                  noiseSuppression: true,
                  autoGainControl: true,
                }
              : {
                  echoCancellation: true,
                  noiseSuppression: true,
                  autoGainControl: true,
                },
          });
        } catch (error) {
          if (!deviceId) throw error;
          stream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            },
          });
        }

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        const audioContext = new AudioContext();
        await audioContext.resume();
        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();

        analyser.fftSize = 512;
        analyser.smoothingTimeConstant = 0.75;
        const data = new Float32Array(analyser.fftSize);
        source.connect(analyser);

        streamRef.current = stream;
        audioContextRef.current = audioContext;
        sourceRef.current = source;
        analyserRef.current = analyser;

        const tick = () => {
          analyser.getFloatTimeDomainData(data);
          let sum = 0;

          for (let index = 0; index < data.length; index += 1) {
            sum += data[index] * data[index];
          }

          const rms = Math.sqrt(sum / data.length);
          const nextLevel = rmsToVoiceLevel(rms);
          smoothedLevel = smoothedLevel * 0.72 + nextLevel * 0.28;
          setSelfLevel(smoothedLevel < 0.03 ? 0 : smoothedLevel);
          if (smoothedLevel > 0.08 && !hasDetectedVoiceRef.current) {
            hasDetectedVoiceRef.current = true;
            onVoiceDetectedRef.current?.();
          }
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
  }, [active, deviceId, selfTest]);

  const visibleLevel = normalizeLevel(selfTest ? (active ? selfLevel : 0) : level ?? 0);
  const speaking = visibleLevel > 0.08;

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
          <Mic size={16} className="text-[var(--accent-strong)]" />
          {label}
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${
            speaking ? "bg-[var(--accent-soft)] text-[var(--accent-strong)]" : "bg-[var(--surface-muted)] text-[var(--text-secondary)]"
          }`}
        >
          {speaking ? "Speaking" : "Silent"}
        </span>
      </div>

      <div className="h-3 overflow-hidden rounded-full bg-[var(--surface-muted)]">
        <div
          className="h-full rounded-full bg-[linear-gradient(90deg,#22c55e_0%,#eab308_58%,#ef4444_100%)] transition-[width] duration-100"
          style={{ width: `${Math.round(visibleLevel * 100)}%` }}
        />
      </div>

      {helper ? <p className="mt-3 text-xs leading-5 text-[var(--text-secondary)]">{helper}</p> : null}
    </div>
  );
}
