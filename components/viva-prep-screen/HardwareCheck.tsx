"use client";

import { forwardRef } from "react";
import { AlertTriangle, Camera, CameraOff, CheckCircle2, Mic, Volume2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import MicLevelMeter from "@/components/ai-viva/MicLevelMeter";
import type { HardwareCheckState } from "./useHardwareCheck";

const DEFAULT_MIC_DEVICE = "__default_microphone__";

const HardwareCheck = forwardRef<HTMLElement, { hw: HardwareCheckState; disabled: boolean }>(
  function HardwareCheck({ hw, disabled }, ref) {
    const cameraActive = hw.cameraEnabled && hw.cameraAllowed && hw.cameraStream;

    return (
      <section
        ref={ref}
        id="hardware-check"
        className="scroll-mt-6 rounded-2xl border-2 border-[var(--accent)] bg-[var(--surface-raised)] p-5 sm:p-6"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-[22px] font-semibold leading-7 tracking-tight text-[var(--text-primary)]">
              Hardware Check
            </h2>
            <p className="mt-1 text-[15px] leading-5 text-[var(--text-secondary)]">
              Test your microphone and speaker before starting.
            </p>
          </div>
          {hw.checking ? (
            <span className="text-[13px] text-[var(--text-secondary)]">Checking…</span>
          ) : hw.micAllowed ? (
            <CheckCircle2 size={20} className="text-[var(--accent)]" />
          ) : (
            <AlertTriangle size={20} className="text-rose-500" />
          )}
        </div>

        <div className="mt-4 grid gap-5 lg:grid-cols-2">
        <div className="relative h-56 overflow-hidden rounded-xl border border-[var(--border)] bg-[#162226] lg:h-full lg:min-h-64">
          {cameraActive ? (
            <video ref={hw.videoRef} autoPlay muted playsInline className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-white/65">
              {hw.cameraEnabled ? <Camera size={22} /> : <CameraOff size={22} />}
              <span className="text-[13px]">
                {hw.cameraEnabled ? "Camera preview unavailable (optional)" : "Camera is off"}
              </span>
            </div>
          )}
          <button
            type="button"
            onClick={() => hw.setCameraEnabled((enabled) => !enabled)}
            disabled={disabled}
            aria-pressed={hw.cameraEnabled}
            aria-label={hw.cameraEnabled ? "Turn camera off" : "Turn camera on"}
            className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur transition hover:bg-black/75 disabled:opacity-50"
          >
            {hw.cameraEnabled ? <CameraOff size={17} /> : <Camera size={17} />}
          </button>
        </div>

        {hw.micAllowed ? (
          <div className="space-y-4">
            <div>
              <span className="mb-1.5 flex items-center gap-2 text-[17px] font-semibold text-[var(--text-primary)]">
                <Mic size={18} className="text-[var(--accent)]" /> Microphone
              </span>
              <Select
                value={hw.selectedMicDeviceId || DEFAULT_MIC_DEVICE}
                onValueChange={(value) => hw.selectMic(value === DEFAULT_MIC_DEVICE ? "" : value)}
                disabled={disabled}
              >
                <SelectTrigger aria-label="Select microphone" className="h-10 rounded-xl border-[var(--border)] bg-[var(--surface-tint)] text-[15px] text-[var(--text-primary)] shadow-none">
                  <SelectValue placeholder="Choose microphone" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={DEFAULT_MIC_DEVICE}>Default microphone</SelectItem>
                  {hw.micDevices
                    .filter((device) => device.deviceId)
                    .map((device, index) => (
                      <SelectItem key={device.deviceId} value={device.deviceId}>
                        {device.label || `Microphone ${index + 1}`}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <div className="mt-2">
                <MicLevelMeter
                  selfTest
                  active={hw.micAllowed && !disabled}
                  deviceId={hw.selectedMicDeviceId}
                  onVoiceDetected={() => hw.setMicVoiceDetected(true)}
                  label="Input level"
                  helper={hw.micVoiceDetected ? undefined : "Say a few words to test your microphone."}
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border)] pt-4">
              <span className="inline-flex items-center gap-2 text-[17px] font-semibold text-[var(--text-primary)]">
                <Volume2 size={18} className="text-[var(--accent)]" /> Speaker
              </span>
              {!hw.speakerTonePlayed ? (
                <button
                  type="button"
                  disabled={hw.speakerTesting || hw.checking || disabled}
                  onClick={() => void hw.testSpeaker()}
                  className="rounded-lg border border-[var(--accent)] px-4 py-2 text-[15px] font-semibold text-[var(--accent)] transition hover:bg-[var(--accent-soft)] disabled:opacity-50"
                >
                  {hw.speakerTesting ? "Playing test tone…" : "Test speaker"}
                </button>
              ) : (
                <span className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void hw.testSpeaker()}
                    className="px-2 py-2 text-[13px] font-semibold text-[var(--text-secondary)] hover:text-[var(--accent)]"
                  >
                    Play again
                  </button>
                  <button
                    type="button"
                    onClick={() => hw.setSpeakerConfirmed(true)}
                    className={`rounded-lg px-4 py-2 text-[15px] font-semibold transition ${
                      hw.speakerConfirmed
                        ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                        : "bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]"
                    }`}
                  >
                    {hw.speakerConfirmed ? "Speaker confirmed" : "I heard it"}
                  </button>
                </span>
              )}
            </div>
          </div>
        ) : (
          !hw.checking && (
            <p className="mt-4 rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-[15px] text-rose-700">
              Microphone not detected. Allow microphone access in your browser, then reload.
            </p>
          )
        )}
        </div>
      </section>
    );
  },
);

export default HardwareCheck;
