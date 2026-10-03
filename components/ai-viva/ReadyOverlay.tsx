"use client";

import { useEffect, useRef, useState } from "react";
import {
  Mic,
  Camera,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  TimerReset,
  Volume2,
} from "lucide-react";
import UrologicsBrand from "@/components/brand/UrologicsBrand";
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
    async function requestPermissions() {
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
        if (!cancelled) setCameraAllowed(false);
      }
    }
    void requestPermissions();
    return () => {
      cancelled = true;
      cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = null;
    };
  }, []);

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
    void onBegin(Boolean(cameraAllowed && cameraStream), selectedExaminer, selectedMicDeviceId || undefined);
  }

  return (
    <div className="absolute inset-0 z-50 overflow-y-auto bg-white/95 p-3 backdrop-blur-xl sm:p-4">

      <div className="mx-auto my-4 w-full max-w-5xl overflow-hidden rounded-[28px] border border-[#0f7896]/12 bg-white shadow-[0_16px_40px_rgba(15,120,150,0.12)] lg:my-6">
        <div className="grid lg:grid-cols-[1.1fr_0.9fr]">
          <div className="border-b border-[#0f7896]/12 p-5 sm:p-6 lg:border-b-0 lg:border-r lg:p-8">
            <div className="mb-6 space-y-4 lg:mb-8">
              <UrologicsBrand
                product="AI Viva"
                tag={selectedMode === "fast" ? "Fast and Furious session" : "Calm and Composed session"}
              />
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-50 text-[#0f7896]">
                  <ShieldCheck size={22} />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-[#0f7896]">
                    Session Setup
                  </p>
                  <h1 className="text-2xl font-semibold text-[#071014]">
                    {selectedMode === "fast" ? "Fast and Furious" : "Calm and Composed"} Viva
                  </h1>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-lg font-medium text-[#071014]">{vivaTitle}</p>
              <p className="max-w-2xl text-sm leading-6 text-[#071014]/65">
                Choose your examiner, confirm your microphone, and enter the premium Urologics AI Viva room.
                Fast mode runs on a total 10 minute clock and ends as soon as the question set is complete.
              </p>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3 lg:mt-8 lg:gap-4">
              <div className="urologics-subpanel p-4">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-50 text-[#0f7896]">
                  <TimerReset size={18} />
                </div>
                <div className="text-sm font-medium text-[#071014]">
                  {selectedMode === "fast" ? "10 Minute Sprint" : "Adaptive Live Flow"}
                </div>
                <p className="mt-2 text-xs leading-5 text-[#071014]/65">
                  {selectedMode === "fast"
                    ? "Rapid progression with immediate transitions once key points are covered."
                    : "Natural viva pacing with targeted follow-up questions."}
                </p>
              </div>

              <div className="urologics-subpanel p-4">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-50 text-[#0f7896]">
                  <Volume2 size={18} />
                </div>
                <div className="text-sm font-medium text-[#071014]">Examiner Selection</div>
                <p className="mt-2 text-xs leading-5 text-[#071014]/65">
                  Pick the examiner style that feels right for this session before you begin.
                </p>
              </div>

              <div className="urologics-subpanel p-4">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-50 text-[#0f7896]">
                  <Mic size={18} />
                </div>
                <div className="text-sm font-medium text-[#071014]">Live Speech to Speech</div>
                <p className="mt-2 text-xs leading-5 text-[#071014]/65">
                  The examiner listens and responds in real time, including when you interrupt. Microphone access is required; camera is optional.
                </p>
              </div>
            </div>

            
          </div>

          <div className="p-5 sm:p-6 lg:p-8">
            <div className="rounded-[28px] border border-[#0f7896]/12 bg-cyan-50 p-6">
              <div className="mb-6">
                <p className="text-xs uppercase tracking-[0.22em] text-[#0f7896]">System Check</p>
                  <h2 className="mt-2 text-xl font-semibold text-[#071014]">{isStarting ? "Connecting your Viva" : "Ready to begin"}</h2>
                <p className="mt-2 text-sm leading-6 text-[#071014]/65">
                  Examiner selected: <span className="text-[#071014]">{selectedExaminer.name}</span>
                </p>
              </div>

              {errorMessage && (
                <div role="alert" className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">
                  {errorMessage}
                </div>
              )}

              {selectedMode === "calm" && (
                <div className="mb-5 space-y-3 rounded-2xl border border-[#0f7896]/12 bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#0f7896]">Audio readiness</p>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-[#071014]">Microphone input</span>
                    <span className={micVoiceDetected ? "text-emerald-700" : "text-[#071014]/55"}>
                      {checking ? "Checking permission" : !micAllowed ? "Permission required" : micVoiceDetected ? "Voice detected" : "Speak to test"}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                    <span className="text-[#071014]">Speaker output</span>
                    {!speakerTonePlayed ? (
                      <button type="button" disabled={speakerTesting || checking} onClick={() => void testSpeaker()} className="rounded-full border border-[#0f7896]/20 px-3 py-1.5 text-xs font-semibold text-[#0f7896] disabled:opacity-50">
                        {speakerTesting ? "Playing test tone…" : "Play test tone"}
                      </button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={() => void testSpeaker()} className="text-xs font-semibold text-[#0f7896]">Play again</button>
                        <button type="button" onClick={() => setSpeakerConfirmed(true)} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${speakerConfirmed ? "bg-emerald-100 text-emerald-800" : "bg-[#0f7896] text-white"}`}>
                          {speakerConfirmed ? "Speaker confirmed" : "I heard it"}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {selectedMode === "calm" && isStarting && (
                <div role="status" aria-live="polite" className="mb-5 rounded-2xl border border-[#0f7896]/15 bg-white p-4">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#0f7896]">Starting checks</p>
                  <ol className="space-y-2 text-sm">
                    {([
                      ["server", "Preparing AI Viva session"],
                      ["websocket", "Backend WebSocket connected"],
                      ["speaker", "Speaker output ready"],
                      ["microphone", "Microphone input ready"],
                      ["gemini", "Waiting for Gemini Live audio"],
                      ["ready", "All systems ready"],
                    ] as const).map(([stage, label]) => {
                      const order = ["server", "websocket", "speaker", "microphone", "gemini", "ready"] as const;
                      const currentIndex = order.indexOf(startupStage as (typeof order)[number]);
                      const stageIndex = order.indexOf(stage);
                      const complete = startupStage === "ready" || currentIndex > stageIndex;
                      const current = startupStage === stage;
                      return (
                        <li key={stage} className="flex items-center gap-2">
                          {complete ? <CheckCircle2 size={16} className="text-emerald-600" /> : current ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#0f7896] border-t-transparent" /> : <span className="h-4 w-4 rounded-full border border-slate-300" />}
                          <span className={complete || current ? "text-[#071014]" : "text-[#071014]/45"}>{label}{current ? "…" : ""}</span>
                        </li>
                      );
                    })}
                  </ol>
                </div>
              )}

              {cameraAllowed && cameraStream && (
                <div className="mb-5 overflow-hidden rounded-2xl">
                  <video
                    ref={videoRef}
                    autoPlay
                    muted
                    playsInline
                    className="h-48 w-full object-cover"
                  />
                </div>
              )}

              <div className="space-y-4 text-sm">
                <div className="flex items-center justify-between rounded-2xl border border-[#0f7896]/12 bg-white px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Mic size={18} className="text-[#0f7896]" />
                    <span className="text-[#071014]">Microphone</span>
                  </div>

                  {checking ? (
                    <span className="text-[#071014]/65">Checking...</span>
                  ) : micAllowed ? (
                    <CheckCircle2 size={18} className="text-[#0f7896]" />
                  ) : (
                    <AlertTriangle size={18} className="text-red-400" />
                  )}
                </div>

                {micAllowed ? (
                  <div className="space-y-3">
                    <label className="block">
                      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-[#071014]/55">
                        Microphone Device
                      </span>
                      <select
                        value={selectedMicDeviceId}
                      onChange={(event) => { setSelectedMicDeviceId(event.target.value); setMicVoiceDetected(false); }}
                        className="urologics-input bg-white text-sm"
                      >
                        {micDevices.length === 0 ? (
                          <option value="">Default microphone</option>
                        ) : (
                          micDevices.map((device, index) => (
                            <option key={device.deviceId || index} value={device.deviceId}>
                              {device.label || `Microphone ${index + 1}`}
                            </option>
                          ))
                        )}
                      </select>
                    </label>
                    <MicLevelMeter
                      selfTest
                      active={micAllowed && !isStarting}
                      deviceId={selectedMicDeviceId}
                      onVoiceDetected={() => setMicVoiceDetected(true)}
                      label="Speak to test microphone"
                      helper="If the line does not move while you speak, choose another microphone or check browser permission."
                    />
                  </div>
                ) : null}

                <div className="flex items-center justify-between rounded-2xl border border-[#0f7896]/12 bg-white px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Camera size={18} className="text-[#0f7896]" />
                    <span className="text-[#071014]">Camera Preview</span>
                  </div>

                  {checking ? (
                    <span className="text-[#071014]/65">Checking...</span>
                  ) : !cameraAllowed ? (
                    <span className="text-[#071014]/65">Not available</span>
                  ) : (
                    <span className="flex items-center gap-2 text-[#0f7896]">
                      <CheckCircle2 size={18} /> On
                    </span>
                  )}
                </div>
              </div>

              <button
                disabled={!canStart}
                onClick={beginSession}
                className={`mt-6 flex w-full items-center justify-center gap-3 rounded-2xl py-3 font-medium transition-all duration-200 ${
                  canStart
                    ? "bg-[#0f7896] text-white shadow-[0_16px_34px_rgba(15,120,150,0.2)] hover:bg-[#0b6078]"
                    : "cursor-not-allowed bg-[#071014]/10 text-[#071014]/45"
                }`}
              >
                {isStarting ? "Starting AI Viva…" : canStart ? "Run checks and start AI Viva" : checking ? "Checking devices" : !micAllowed ? "Allow microphone access to continue" : selectedMode === "calm" && !micVoiceDetected ? "Speak to test microphone" : selectedMode === "calm" && !speakerConfirmed ? "Confirm speaker test to continue" : "Ready to start AI Viva"}
                {canStart && <ArrowRight size={18} />}
              </button>

              {!micAllowed && !checking && (
                <p className="mt-4 text-xs text-red-400">
                  Allow microphone access in your browser, then reload to start the viva. Camera access is optional.
                </p>
              )}
            </div>
            <div className="mt-6 lg:mt-8">
              <div className="mb-4 text-left">
                <p className="text-xs uppercase tracking-[0.22em] text-[#0f7896]">Choose Examiner</p>
                <p className="mt-2 text-sm text-[#071014]/65">
                  Select the voice and examiner temperament you want for this viva.
                </p>
              </div>

              <div className="grid max-h-[38vh] gap-3 overflow-y-auto pr-1 lg:max-h-none lg:overflow-visible lg:pr-0">
                {examiners.map((examiner) => {
                  const active = examiner.id === selectedExaminerId;

                  return (
                    <button
                      key={examiner.id}
                      type="button"
                      onClick={() => setSelectedExaminerId(examiner.id)}
                      className={`rounded-2xl border px-4 py-4 text-left transition-all ${
                        active
                          ? "border-[#0f7896] bg-[#0f7896] text-white shadow-[0_24px_60px_rgba(15,120,150,0.25)]"
                          : "border-[#0f7896]/12 bg-white hover:border-[#0f7896]/30 hover:bg-cyan-50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className={`text-sm font-semibold ${active ? "text-white" : "text-[#071014]"}`}>{examiner.name}</div>
                          <div className={`mt-1 text-xs uppercase tracking-[0.2em] ${active ? "text-white/70" : "text-[#071014]/55"}`}>
                            {examiner.title}
                          </div>
                        </div>
                        {active && <CheckCircle2 size={18} className="text-white" />}
                      </div>
                      <p className={`mt-3 text-sm leading-6 ${active ? "text-white/78" : "text-[#071014]/65"}`}>
                        {examiner.personality}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
