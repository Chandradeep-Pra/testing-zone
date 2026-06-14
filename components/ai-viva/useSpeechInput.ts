"use client";

import { useEffect, useRef, useState } from "react";

type SttMessage = {
  transcript?: string;
  final?: boolean;
  speechEnded?: boolean;
};

export function useSpeechInput(
  onInterim: (text: string) => void,
  onFinal: (text: string) => void | Promise<void>,
  onSpeechEndedWithoutFinal?: () => void | Promise<void>,
  getMicDeviceId?: () => string | undefined
) {
  const wsRef = useRef<WebSocket | null>(null);
  const transcriptBuffer = useRef("");
  const interimTranscriptRef = useRef("");

  const audioContextRef = useRef<AudioContext | null>(null);
  const workletRef = useRef<AudioWorkletNode | null>(null);
  const silentGainRef = useRef<GainNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const startingRef = useRef(false);
  const lastLevelUpdateRef = useRef(0);
  const onInterimRef = useRef(onInterim);
  const onFinalRef = useRef(onFinal);
  const onSpeechEndedWithoutFinalRef = useRef(onSpeechEndedWithoutFinal);
  const [micLevel, setMicLevel] = useState(0);

  useEffect(() => {
    onInterimRef.current = onInterim;
    onFinalRef.current = onFinal;
    onSpeechEndedWithoutFinalRef.current = onSpeechEndedWithoutFinal;
  }, [onInterim, onFinal, onSpeechEndedWithoutFinal]);

  async function ensureSocketReady() {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return wsRef.current;
    }

    if (wsRef.current?.readyState === WebSocket.CONNECTING) {
      await new Promise<WebSocket>((resolve, reject) => {
        const ws = wsRef.current;
        if (!ws) {
          reject(new Error("Socket unavailable"));
          return;
        }

        ws.addEventListener("open", () => resolve(ws), { once: true });
        ws.addEventListener("error", () => reject(new Error("Socket connection failed")), {
          once: true,
        });
      });

      return wsRef.current;
    }

    const ws = new WebSocket("wss://testing-zone-hx7q.onrender.com");
    ws.binaryType = "arraybuffer";
    wsRef.current = ws;
    console.info("[Viva STT WebSocket] connecting", {
      url: "wss://testing-zone-hx7q.onrender.com",
    });

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data as string) as SttMessage;
      if (!data) return;
      console.debug("[Viva STT WebSocket] message", data);

      if (data.transcript) {
        if (data.final) {
          const normalizedFinal = data.transcript.trim();
          if (normalizedFinal) {
            transcriptBuffer.current = [transcriptBuffer.current, normalizedFinal]
              .filter(Boolean)
              .join(" ")
              .trim();
          }

          interimTranscriptRef.current = "";
          onInterimRef.current(transcriptBuffer.current);
        } else {
          interimTranscriptRef.current = data.transcript.trim();
          const combinedTranscript = [transcriptBuffer.current, interimTranscriptRef.current]
            .filter(Boolean)
            .join(" ")
            .trim();

          onInterimRef.current(combinedTranscript);
        }
      }

      if (data.speechEnded) {
        const finalText = [transcriptBuffer.current, interimTranscriptRef.current]
          .filter(Boolean)
          .join(" ")
          .trim();

        if (finalText) {
          void onFinalRef.current(finalText);
        } else if (onSpeechEndedWithoutFinalRef.current) {
          void onSpeechEndedWithoutFinalRef.current();
        }

        transcriptBuffer.current = "";
        interimTranscriptRef.current = "";
      }
    };

    ws.onopen = () => {
      console.info("[Viva STT WebSocket] open");
    };

    ws.onerror = (event) => {
      console.error("[Viva STT WebSocket] error", event);
    };

    ws.onclose = (event) => {
      console.info("[Viva STT WebSocket] close", {
        code: event.code,
        reason: event.reason,
        wasClean: event.wasClean,
      });
    };

    await new Promise<WebSocket>((resolve, reject) => {
      ws.addEventListener("open", () => resolve(ws), { once: true });
      ws.addEventListener("error", () => reject(new Error("Socket connection failed")), {
        once: true,
      });
    });

    return ws;
  }

  async function start() {
    if (startingRef.current || mediaStreamRef.current) {
      console.info("[Viva STT] start skipped; microphone is already starting or active");
      return;
    }

    startingRef.current = true;

    try {
      await ensureSocketReady();

      const micDeviceId = getMicDeviceId?.();

      console.info("[Viva STT] requesting microphone", {
        micDeviceId: micDeviceId || "default",
      });

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: micDeviceId ? { deviceId: { exact: micDeviceId } } : true,
        });
      } catch (error) {
        if (!micDeviceId) {
          throw error;
        }

        console.warn("[Viva STT] selected microphone failed; falling back to default", error);
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }

      mediaStreamRef.current = stream;
      console.info("[Viva STT] microphone stream started", {
        tracks: stream.getAudioTracks().map((track) => ({
          label: track.label,
          enabled: track.enabled,
          muted: track.muted,
          readyState: track.readyState,
        })),
      });

      const audioContext = new AudioContext({
        sampleRate: 16000,
      });

      audioContextRef.current = audioContext;

      if (audioContext.state === "suspended") {
        await audioContext.resume();
      }

      await audioContext.audioWorklet.addModule("/audio-processor.js");

      const source = audioContext.createMediaStreamSource(stream);
      sourceRef.current = source;

      const worklet = new AudioWorkletNode(audioContext, "audio-processor");
      workletRef.current = worklet;

      const silentGain = audioContext.createGain();
      silentGain.gain.value = 0;
      silentGainRef.current = silentGain;

      worklet.port.onmessage = (event: MessageEvent<Int16Array | ArrayBuffer>) => {
        const pcm =
          event.data instanceof Int16Array
            ? event.data
            : new Int16Array(event.data);
        const now = performance.now();

        if (now - lastLevelUpdateRef.current > 80 && pcm.length > 0) {
          let sum = 0;

          for (let index = 0; index < pcm.length; index += 1) {
            const value = pcm[index] / 32768;
            sum += value * value;
          }

          setMicLevel(Math.max(0, Math.min(1, Math.sqrt(sum / pcm.length) * 4.5)));
          lastLevelUpdateRef.current = now;
        }

        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(event.data);
        } else {
          console.debug("[Viva STT WebSocket] audio chunk skipped; socket is not open", {
            readyState: wsRef.current?.readyState,
          });
        }
      };

      source.connect(worklet);
      worklet.connect(silentGain);
      silentGain.connect(audioContext.destination);
      console.info("[Viva STT] audio worklet connected");
    } catch (error) {
      console.error("[Viva STT] failed to start microphone capture", error);
      stop();
      throw error;
    } finally {
      startingRef.current = false;
    }
  }

  function stop() {
    console.info("[Viva STT] stopping microphone stream");
    if (workletRef.current) {
      workletRef.current.disconnect();
      workletRef.current = null;
    }

    if (silentGainRef.current) {
      silentGainRef.current.disconnect();
      silentGainRef.current = null;
    }

    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    if (audioContextRef.current) {
      void audioContextRef.current.close();
      audioContextRef.current = null;
    }

    setMicLevel(0);
    startingRef.current = false;
  }

  function closeSocket() {
    if (wsRef.current) {
      console.info("[Viva STT WebSocket] close requested");
      wsRef.current.close();
      wsRef.current = null;
    }
  }

  function getTranscriptBuffer() {
    return [transcriptBuffer.current, interimTranscriptRef.current]
      .filter(Boolean)
      .join(" ")
      .trim();
  }

  function resetTranscriptBuffer() {
    transcriptBuffer.current = "";
    interimTranscriptRef.current = "";
  }

  return {
    start,
    stop,
    closeSocket,
    getTranscriptBuffer,
    resetTranscriptBuffer,
    micLevel,
  };
}
