"use client";

import { useEffect, useRef, useState } from "react";
import {
  Mic,
  Camera,
  CameraOff,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  TimerReset,
  Volume2,
  Sparkles,
} from "lucide-react";
import Image from "next/image";
import { appPath } from "@/lib/app-path";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import MicLevelMeter from "./MicLevelMeter";
import {
  getDefaultExaminer,
  EXAMINER_VOICES,
  type ExaminerVoice,
  type VivaMode,
} from "@/lib/examiner-voices";

type ReadyOverlayProps = {
  onBegin: (cameraEnabled: boolean, examiner: ExaminerVoice, micDeviceId?: string) => void | Promise<void>;
  vivaTitle: string;
  selectedMode: VivaMode;
  errorMessage?: string | null;
  isStarting?: boolean;
  startupStage?: "idle" | "server" | "websocket" | "gemini" | "microphone" | "speaker" | "ready" | "error";
};

const DEFAULT_MIC_DEVICE = "__default_microphone__";

export default function ReadyOverlay({
  onBegin,
  vivaTitle,
  selectedMode,
  errorMessage,
  isStarting = false,
  startupStage = "idle",
}: ReadyOverlayProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);

  const [micAllowed, setMicAllowed] = useState(false);
  const [cameraAllowed, setCameraAllowed] = useState(false);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [checking, setChecking] = useState(true);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [micDevices, setMicDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedMicDeviceId, setSelectedMicDeviceId] = useState("");
  const [micVoiceDetected, setMicVoiceDetected] = useState(false);
  const [speakerTonePlayed, setSpeakerTonePlayed] = useState(false);
  const [speakerConfirmed, setSpeakerConfirmed] = useState(false);
  const [speakerTesting, setSpeakerTesting] = useState(false);
  const [selectedExaminerId, setSelectedExaminerId] = useState(
    getDefaultExaminer(selectedMode).id
  );

  const examiners = EXAMINER_VOICES[selectedMode];
  const selectedExaminer =
    examiners.find((examiner) => examiner.id === selectedExaminerId) ||
    getDefaultExaminer(selectedMode);

  useEffect(() => {
    setSelectedExaminerId(getDefaultExaminer(selectedMode).id);
  }, [selectedMode]);

  useEffect(() => {
    let cancelled = false;
    async function requestMicrophonePermission() {
      try {
        const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        micStream.getTracks().forEach((track) => track.stop());
        if (cancelled) return;
        setMicAllowed(true);
        const devices = await navigator.mediaDevices.enumerateDevices();
        if (cancelled) return;
        const audioInputs = devices.filter((device) => device.kind === "audioinput");
        setMicDevices(audioInputs);
        setSelectedMicDeviceId((current) => current || audioInputs[0]?.deviceId || "");
        setChecking(false);
      } catch {
        if (cancelled) return;
        setMicAllowed(false);
        setMicDevices([]);
        setSelectedMicDeviceId("");
        setChecking(false);
      }
    }
    void requestMicrophonePermission();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!cameraEnabled) {
      cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = null;
      setCameraStream(null);
      return;
    }

    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        cameraStreamRef.current = stream;
        setCameraStream(stream);
        setCameraAllowed(true);
      } catch {
        if (!cancelled) {
          setCameraAllowed(false);
          setCameraStream(null);
        }
      }
    }
    void startCamera();
    return () => {
      cancelled = true;
      cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = null;
    };
  }, [cameraEnabled]);

  useEffect(() => {
    if (videoRef.current && cameraStream) {
      videoRef.current.srcObject = cameraStream;
      void videoRef.current.play().catch(() => {});
    }
  }, [cameraStream]);

  const audioChecksPass = selectedMode !== "calm" || (micVoiceDetected && speakerConfirmed);
  const canStart = !checking && micAllowed && audioChecksPass && !isStarting;

  async function testSpeaker() {
    setSpeakerTesting(true);
    setSpeakerTonePlayed(false);
    setSpeakerConfirmed(false);
    try {
      const context = new AudioContext();
      await context.resume();
      if (context.state !== "running") throw new Error("Browser audio output is unavailable.");
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.frequency.value = 880;
      gain.gain.value = 0.12;
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start();
      await new Promise((resolve) => setTimeout(resolve, 450));
      oscillator.stop();
      await context.close();
      setSpeakerTonePlayed(true);
    } catch {
      setSpeakerTonePlayed(false);
    } finally {
      setSpeakerTesting(false);
    }
  }

  function beginSession() {
    if (!canStart) return;
    void onBegin(Boolean(cameraEnabled && cameraAllowed && cameraStream), selectedExaminer, selectedMicDeviceId || undefined);
  }

  return (
    <div className="absolute inset-0 z-50 overflow-y-auto bg-[var(--background)] text-[var(--text-primary)]">
      <div className="mx-auto max-w-6xl px-4 py-4 sm:px-7 sm:py-6">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border)] pb-4">
          
          <div className="flex items-center gap-3">
            
            <div className="flex items-center gap-2  border-[var(--border)] pl-3">
              <Image src={appPath("/logo.png")} alt="Urologics" width={36} height={36} className="h-9 w-9 object-contain" />
              <span className="text-sm font-semibold text-[var(--text-primary)]">Uro AI</span>
            </div>
            <span className="rounded-full border border-[var(--accent)]/25 bg-[var(--accent-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--accent-strong)] sm:text-sm">
              {selectedMode === "fast" ? "Fast and Furious" : "Calm and Composed"}
            </span>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[1.08fr_0.92fr] lg:gap-0">
          <section className="py-6 lg:pr-9">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-secondary)]">Session setup</p>
                <h2 className="mt-1 text-2xl font-semibold text-[var(--text-primary)]">{vivaTitle}</h2>
              </div>
              
            </div>

            <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-[var(--text-secondary)]">
              <span className="inline-flex items-center gap-1.5"><Mic size={14} className="text-[var(--accent-strong)]" /> Live voice viva</span>
             
              <span className="inline-flex items-center gap-1.5"><CheckCircle2 size={14} className="text-[var(--accent-strong)]" /> Case-based assessment</span>
              <span className="inline-flex items-center gap-1.5"><CheckCircle2 size={14} className="text-[var(--accent-strong)]" /> Adaptive follow-ups</span>
            </div>

            <div className="mt-8">
              <div className="mb-3 flex items-end justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-[var(--text-primary)]">Choose your examiner</h3>
                  <p className="mt-1 text-sm text-[var(--text-secondary)]">Select a voice and examination style.</p>
                </div>
                <span className="text-xs text-[var(--text-secondary)]">{examiners.length} available</span>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                {examiners.map((examiner) => {
                  const active = examiner.id === selectedExaminerId;
                  return (
                    <button
                      key={examiner.id}
                      type="button"
                      onClick={() => setSelectedExaminerId(examiner.id)}
                      aria-pressed={active}
                      className={`min-w-0 rounded-lg border px-4 py-3 text-left transition-colors ${
                        active
                          ? "border-[#02C39A] bg-[#02C39A]/[0.07] shadow-[0_0_0_1px_#02C39A]"
                          : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-muted)]"
                      }`}
                    >
                      <span className="flex items-start justify-between gap-3">
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold text-[var(--text-primary)]">{examiner.name}</span>
                          <span className="mt-1 block truncate text-xs text-[var(--text-secondary)]">{examiner.title}</span>
                        </span>
                        {active && <CheckCircle2 size={18} className="shrink-0 text-[var(--accent-strong)]" />}
                      </span>
                      <span className="mt-2 block text-xs leading-5 text-[var(--text-secondary)]">{examiner.personality}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="space-y-4 border-t border-[var(--border)] py-6 lg:border-l lg:border-t-0 lg:pl-8">
            <div className="relative aspect-video overflow-hidden rounded-lg border border-[var(--border)] bg-[#162226]">
              {cameraEnabled && cameraAllowed && cameraStream ? (
                <video ref={videoRef} autoPlay muted playsInline className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-2 text-white/65">
                  {cameraEnabled ? <Camera size={24} /> : <CameraOff size={24} />}
                  <span className="text-sm">{checking && cameraEnabled ? "Checking camera…" : cameraEnabled ? "Camera preview unavailable" : "Camera is off"}</span>
                </div>
              )}
              <span className={`absolute left-3 top-3 inline-flex items-center gap-2 rounded-full px-2.5 py-1.5 text-[11px] font-semibold backdrop-blur ${cameraEnabled && cameraAllowed && cameraStream ? "bg-black/55 text-white" : "bg-[var(--surface-raised)]/90 text-[var(--text-secondary)]"}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${cameraEnabled && cameraAllowed && cameraStream ? "bg-[#02C39A]" : "bg-slate-400"}`} />
                {cameraEnabled && cameraAllowed && cameraStream ? "Camera Active" : cameraEnabled ? "Camera Optional" : "Camera Off"}
              </span>
              <button
                type="button"
                onClick={() => setCameraEnabled((enabled) => !enabled)}
                disabled={isStarting}
                aria-pressed={cameraEnabled}
                aria-label={cameraEnabled ? "Turn camera off" : "Turn camera on"}
                className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur transition hover:bg-black/75 disabled:opacity-50"
                title={cameraEnabled ? "Turn camera off" : "Turn camera on"}
              >
                {cameraEnabled ? <CameraOff size={17} /> : <Camera size={17} />}
              </button>
            </div>

            <section className="rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-[var(--text-primary)]">Hardware Diagnostics</h3>
                  <p className="mt-1 text-xs text-[var(--text-secondary)]">Check your microphone and speaker before starting.</p>
                </div>
                {checking ? <span className="text-xs text-[var(--text-secondary)]">Checking devices…</span> : micAllowed ? <CheckCircle2 size={18} className="text-[var(--accent-strong)]" /> : <AlertTriangle size={18} className="text-rose-500" />}
              </div>

              {micAllowed ? (
                <div className="mt-4 space-y-3">
                  <div>
                    <span className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">Microphone input</span>
                    <Select
                      value={selectedMicDeviceId || DEFAULT_MIC_DEVICE}
                      onValueChange={(value) => {
                        setSelectedMicDeviceId(value === DEFAULT_MIC_DEVICE ? "" : value);
                        setMicVoiceDetected(false);
                      }}
                      disabled={isStarting}
                    >
                      <SelectTrigger aria-label="Select microphone" className="h-11 rounded-2xl border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] shadow-none focus-visible:border-[var(--accent)] focus-visible:ring-[var(--focus)]">
                        <SelectValue placeholder="Choose microphone" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={DEFAULT_MIC_DEVICE}>Default microphone</SelectItem>
                        {micDevices.filter((device) => device.deviceId).map((device, index) => (
                          <SelectItem key={device.deviceId} value={device.deviceId}>
                            {device.label || `Microphone ${index + 1}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <MicLevelMeter
                    selfTest
                    active={micAllowed && !isStarting}
                    deviceId={selectedMicDeviceId}
                    onVoiceDetected={() => setMicVoiceDetected(true)}
                    label="Input level"
                  />
                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border)] pt-3">
                    <span className="inline-flex items-center gap-2 text-sm font-medium text-[var(--text-primary)]">
                      <Volume2 size={16} className="text-[var(--accent-strong)]" /> Speaker output
                    </span>
                    {!speakerTonePlayed ? (
                      <button type="button" disabled={speakerTesting || checking} onClick={() => void testSpeaker()} className="rounded-md border border-[var(--border)] px-3 py-2 text-xs font-semibold text-[var(--text-primary)] transition hover:bg-[var(--surface-muted)] disabled:opacity-50">
                        {speakerTesting ? "Playing test tone…" : "Test speaker"}
                      </button>
                    ) : (
                      <span className="flex items-center gap-2">
                        <button type="button" onClick={() => void testSpeaker()} className="px-2 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--accent-strong)]">Play again</button>
                        <button type="button" onClick={() => setSpeakerConfirmed(true)} className={`rounded-md px-3 py-2 text-xs font-semibold transition ${speakerConfirmed ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-[#02C39A] text-[#073d34] hover:bg-[#00b88f]"}`}>
                          {speakerConfirmed ? "Speaker confirmed" : "I heard it"}
                        </button>
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <p className="mt-4 rounded-md border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-700 dark:text-rose-300">
                  Allow microphone access in your browser, then reload to start the viva.
                </p>
              )}
            </section>

            {errorMessage && <div role="alert" className="rounded-md border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm leading-6 text-rose-700 dark:text-rose-300">{errorMessage}</div>}

            {selectedMode === "calm" && isStarting && (
              <div role="status" aria-live="polite" className="rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-4 py-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-secondary)]">Starting session</p>
                <ol className="grid gap-x-4 gap-y-1 text-xs sm:grid-cols-2">
                  {([
                    ["server", "Preparing session"],
                    ["websocket", "Backend connected"],
                    ["speaker", "Speaker ready"],
                    ["microphone", "Microphone ready"],
                    ["gemini", "Waiting for examiner"],
                    ["ready", "Ready"],
                  ] as const).map(([stage, label]) => {
                    const order = ["server", "websocket", "speaker", "microphone", "gemini", "ready"] as const;
                    const currentIndex = order.indexOf(startupStage as (typeof order)[number]);
                    const stageIndex = order.indexOf(stage);
                    const complete = startupStage === "ready" || currentIndex > stageIndex;
                    const current = startupStage === stage;
                    return (
                      <li key={stage} className={`flex items-center gap-2 ${complete || current ? "text-[var(--text-primary)]" : "text-[var(--text-tertiary)]"}`}>
                        {complete ? <CheckCircle2 size={14} className="text-[var(--accent-strong)]" /> : current ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" /> : <span className="h-3.5 w-3.5 rounded-full border border-[var(--border)]" />}
                        {label}{current ? "…" : ""}
                      </li>
                    );
                  })}
                </ol>
              </div>
            )}

            <button
              disabled={!canStart}
              onClick={beginSession}
              className={`flex min-h-12 w-full items-center justify-center gap-2 rounded-lg px-5 py-3 text-sm font-semibold transition-colors ${
                canStart
                  ? "bg-[#02C39A] text-[#073d34] shadow-[0_8px_20px_rgba(2,195,154,0.2)] hover:bg-[#00b88f]"
                  : "cursor-not-allowed bg-[var(--surface-muted)] text-[var(--text-tertiary)]"
              }`}
            >
              {isStarting ? "Starting Viva Session…" : "Start Viva Session"}
              {!isStarting && <ArrowRight size={18} />}
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}
