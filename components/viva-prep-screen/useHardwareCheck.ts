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

  const mountedRef = useRef(true);

  // Triggers the browser's permission prompt if access hasn't been granted yet.
  const requestMicrophone = useCallback(async () => {
    setChecking(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      if (!mountedRef.current) return;
      setMicAllowed(true);
      const devices = await navigator.mediaDevices.enumerateDevices();
      if (!mountedRef.current) return;
      const inputs = devices.filter((device) => device.kind === "audioinput");
      setMicDevices(inputs);
      setSelectedMicDeviceId((current) => current || inputs[0]?.deviceId || "");
    } catch {
      if (!mountedRef.current) return;
      setMicAllowed(false);
      setMicDevices([]);
      setSelectedMicDeviceId("");
    } finally {
      if (mountedRef.current) setChecking(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    void requestMicrophone();
    return () => {
      mountedRef.current = false;
    };
  }, [requestMicrophone]);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      if (!mountedRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = stream;
      setCameraStream(stream);
      setCameraAllowed(true);
    } catch {
      if (!mountedRef.current) return;
      setCameraAllowed(false);
      setCameraStream(null);
    }
  }, []);

  useEffect(() => {
    if (!cameraEnabled) {
      cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = null;
      setCameraStream(null);
      return;
    }
    void startCamera();
    return () => {
      cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = null;
    };
  }, [cameraEnabled, startCamera]);

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
    requestMicrophone,
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
    requestCamera: startCamera,
    cameraStream,
    micReady,
    speakerReady,
    ready: !checking && micReady && speakerReady && !isStarting,
  };
}

export type HardwareCheckState = ReturnType<typeof useHardwareCheck>;
