"use client";

import { useEffect, useRef } from "react";

type SttMessage = {
  transcript?: string;
  final?: boolean;
  speechEnded?: boolean;
};

export function useSpeechInput(
  onInterim: (text: string) => void,
  onFinal: (text: string) => void | Promise<void>,
  onSpeechEndedWithoutFinal?: () => void | Promise<void>
) {
  const wsRef = useRef<WebSocket | null>(null);
  const transcriptBuffer = useRef("");
  const interimTranscriptRef = useRef("");

  const audioContextRef = useRef<AudioContext | null>(null);
  const workletRef = useRef<AudioWorkletNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const onInterimRef = useRef(onInterim);
  const onFinalRef = useRef(onFinal);
  const onSpeechEndedWithoutFinalRef = useRef(onSpeechEndedWithoutFinal);

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

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data as string) as SttMessage;
      if (!data) return;

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

    await new Promise<WebSocket>((resolve, reject) => {
      ws.addEventListener("open", () => resolve(ws), { once: true });
      ws.addEventListener("error", () => reject(new Error("Socket connection failed")), {
        once: true,
      });
    });

    return ws;
  }

  async function start() {
    await ensureSocketReady();

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaStreamRef.current = stream;

    const audioContext = new AudioContext({
      sampleRate: 16000,
    });

    audioContextRef.current = audioContext;

    await audioContext.audioWorklet.addModule("/audio-processor.js");

    const source = audioContext.createMediaStreamSource(stream);
    sourceRef.current = source;

    const worklet = new AudioWorkletNode(audioContext, "audio-processor");
    workletRef.current = worklet;

    worklet.port.onmessage = (event: MessageEvent<ArrayBuffer>) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(event.data);
      }
    };

    source.connect(worklet);
  }

  function stop() {
    if (workletRef.current) {
      workletRef.current.disconnect();
      workletRef.current = null;
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
  }

  function closeSocket() {
    if (wsRef.current) {
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
  };
}
