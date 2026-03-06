

//@ts-nocheck
"use client";
import { useEffect, useRef } from "react";

export function useSpeechInput(onInterim, onFinal) {

  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);

  const silenceTimerRef = useRef<any>(null);
  const accumulatedTranscriptRef = useRef("");

  useEffect(() => {

    const ws = new WebSocket("wss://testing-zone-hx7q.onrender.com/");
    // const ws = new WebSocket("ws://localhost:3002");
    ws.binaryType = "arraybuffer";

    wsRef.current = ws;

    ws.onmessage = (event) => {

      const data = JSON.parse(event.data);

      if (!data?.transcript) return;

      // reset silence timer whenever speech arrives
      resetSilenceTimer();

      if (data.final) {

        accumulatedTranscriptRef.current +=
          " " + data.transcript.trim();

      } else {

        const interimText =
          accumulatedTranscriptRef.current +
          " " +
          data.transcript;

        onInterim(interimText.trim());

      }

    };

    return () => {
      ws.close();
    };

  }, []);

  function resetSilenceTimer() {

    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
    }

    silenceTimerRef.current = setTimeout(() => {

      const finalText = accumulatedTranscriptRef.current.trim();

      if (finalText) {
        onFinal(finalText);
        accumulatedTranscriptRef.current = "";
      }

    }, 4000); // 3.5 sec silence

  }

  async function start() {

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    const audioContext = new AudioContext({
      sampleRate: 16000
    });

    audioContextRef.current = audioContext;

    await audioContext.audioWorklet.addModule("/audio-processor.js");

    const source = audioContext.createMediaStreamSource(stream);

    const worklet = new AudioWorkletNode(audioContext, "audio-processor");

    workletNodeRef.current = worklet;

    worklet.port.onmessage = (event) => {

      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(event.data.buffer);
      }

    };

    source.connect(worklet);

    console.log("🎤 Mic streaming PCM");

  }

  function stop() {

    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
    }

    workletNodeRef.current?.disconnect();
    audioContextRef.current?.close();

    console.log("🛑 Mic stopped");

  }

  return {
    start,
    stop
  };
}