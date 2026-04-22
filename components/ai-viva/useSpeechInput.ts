//@ts-nocheck
"use client";

import { useRef } from "react";

export function useSpeechInput(onInterim, onFinal) {
  const wsRef = useRef(null);
  const transcriptBuffer = useRef("");
  const interimTranscriptRef = useRef("");

  const audioContextRef = useRef(null);
  const workletRef = useRef(null);
  const sourceRef = useRef(null);
  const mediaStreamRef = useRef(null);

  async function ensureSocketReady() {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return wsRef.current;
    }

    if (wsRef.current?.readyState === WebSocket.CONNECTING) {
      await new Promise((resolve, reject) => {
        const ws = wsRef.current;
        if (!ws) {
          reject(new Error("Socket unavailable"));
          return;
        }

        ws.addEventListener("open", () => resolve(ws), { once: true });
        ws.addEventListener("error", reject, { once: true });
      });

      return wsRef.current;
    }

    const ws = new WebSocket("wss://testing-zone-hx7q.onrender.com");
    ws.binaryType = "arraybuffer";
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("STT socket connected");
    };

    ws.onclose = () => {
      console.log("STT socket closed");
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
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
          onInterim(transcriptBuffer.current);
        } else {
          interimTranscriptRef.current = data.transcript.trim();
          const combinedTranscript = [transcriptBuffer.current, interimTranscriptRef.current]
            .filter(Boolean)
            .join(" ")
            .trim();

          onInterim(combinedTranscript);
        }
      }

      if (data.speechEnded) {
        const finalText = [transcriptBuffer.current, interimTranscriptRef.current]
          .filter(Boolean)
          .join(" ")
          .trim();

        console.log("Submitting answer:", finalText);

        if (finalText) {
          onFinal(finalText);
        }

        transcriptBuffer.current = "";
        interimTranscriptRef.current = "";
      }
    };

    await new Promise((resolve, reject) => {
      ws.addEventListener("open", () => resolve(ws), { once: true });
      ws.addEventListener("error", reject, { once: true });
    });

    return ws;
  }

  async function start() {
    console.log("Starting speech input");

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

    worklet.port.onmessage = (event) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(event.data);
      }
    };

    source.connect(worklet);
    console.log("Mic streaming to STT");
  }

  function stop() {
    console.log("Stopping microphone");

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
      audioContextRef.current.close();
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
