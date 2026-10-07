"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function useHardwareCheck(isStarting: boolean) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);

  const [checking, setChecking] = useState(true);
  const [micAllowed, setMicAllowed] = useState(false);
  const [micDevices, setMicDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedMicDeviceId, setSelectedMicDeviceId] = useState("");
  const [micVoiceDetected, setMicVoiceDetected] = useState(false);

  const [speakerTesting, setSpeakerTesting] = useState(false);
  const [speakerTonePlayed, setSpeakerTonePlayed] = useState(false);
  const [speakerConfirmed, setSpeakerConfirmed] = useState(false);

  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [cameraAllowed, setCameraAllowed] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function requestMicrophone() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((track) => track.stop());
        if (cancelled) return;
        setMicAllowed(true);
        const devices = await navigator.mediaDevices.enumerateDevices();
        if (cancelled) return;
        const inputs = devices.filter((device) => device.kind === "audioinput");
        setMicDevices(inputs);
        setSelectedMicDeviceId((current) => current || inputs[0]?.deviceId || "");
      } catch {
        if (cancelled) return;
        setMicAllowed(false);
        setMicDevices([]);
        setSelectedMicDeviceId("");
      } finally {
        if (!cancelled) setChecking(false);
      }
    }
    void requestMicrophone();
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

  const testSpeaker = useCallback(async () => {
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
  }, []);

  const selectMic = useCallback((deviceId: string) => {
    setSelectedMicDeviceId(deviceId);
    setMicVoiceDetected(false);
  }, []);

  const micReady = micAllowed && micVoiceDetected;
  const speakerReady = speakerConfirmed;

  return {
    videoRef,
    checking,
    micAllowed,
    micDevices,
    selectedMicDeviceId,
    selectMic,
    micVoiceDetected,
    setMicVoiceDetected,
    speakerTesting,
    speakerTonePlayed,
    speakerConfirmed,
    setSpeakerConfirmed,
    testSpeaker,
    cameraEnabled,
    setCameraEnabled,
    cameraAllowed,
    cameraStream,
    micReady,
    speakerReady,
    ready: !checking && micReady && speakerReady && !isStarting,
  };
}

export type HardwareCheckState = ReturnType<typeof useHardwareCheck>;
