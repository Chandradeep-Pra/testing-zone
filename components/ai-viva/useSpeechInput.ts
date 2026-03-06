//@ts-nocheck
"use client";

import { useEffect, useRef } from "react";

export function useSpeechInput(
  onInterim: (t: string) => void,
  onFinal: (t: string) => void
) {
  const wsRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const listeningRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Connect to STT WebSocket server
    const ws = new WebSocket("ws://localhost:3002");
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("🔌 Connected to STT server");
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.transcript) {
          if (data.final) {
            onFinal(data.transcript);
          } else {
            onInterim(data.transcript);
          }
        }
      } catch (err) {
        console.error("Failed to parse STT message:", err);
      }
    };

    ws.onerror = (err) => {
      console.error("WebSocket error:", err);
    };

    ws.onclose = () => {
      console.log("🔌 Disconnected from STT server");
    };

    return () => {
      ws.close();
      mediaRecorderRef.current?.stop();
    };
  }, [onInterim, onFinal]);

  async function start() {
    if (listeningRef.current) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, {
        mimeType: "audio/webm;codecs=opus" // or "audio/wav" if supported
      });

      recorder.ondataavailable = (event) => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(event.data);
        }
      };

      recorder.onstop = () => {
        listeningRef.current = false;
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start(100); // Send data every 100ms
      mediaRecorderRef.current = recorder;
      listeningRef.current = true;
      console.log("🎤 Mic started (server STT)");
    } catch (err) {
      console.error("Failed to start recording:", err);
    }
  }

  function stop() {
    mediaRecorderRef.current?.stop();
    listeningRef.current = false;
    console.log("🛑 Mic stopped");
  }

  return {
    start,
    stop,
    isListening: () => listeningRef.current
  };
}
