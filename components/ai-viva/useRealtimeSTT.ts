"use client";

import { useRef } from "react";

/* ----------------------------------------
   Helpers
----------------------------------------- */

// Float32 → LINEAR16 PCM
function floatTo16BitPCM(float32: Float32Array) {
  const buffer = new ArrayBuffer(float32.length * 2);
  const view = new DataView(buffer);

  let offset = 0;
  for (let i = 0; i < float32.length; i++, offset += 2) {
    let s = Math.max(-1, Math.min(1, float32[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }

  return buffer;
}

/* ----------------------------------------
   Hook
----------------------------------------- */

export function useRealtimeSTT(
  onInterim: (text: string) => void,
  onFinal: (text: string) => void
) {
  const wsRef = useRef<WebSocket | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  async function start() {
    // 1️⃣ WebSocket to STT server
    const ws = new WebSocket("ws://localhost:5001");
    ws.binaryType = "arraybuffer";
    wsRef.current = ws;

    ws.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.type === "interim") onInterim(data.text);
      if (data.type === "final") onFinal(data.text);
    };

    // 2️⃣ Microphone
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;

    // 3️⃣ Audio context (48kHz REQUIRED)
    const audioCtx = new AudioContext({ sampleRate: 48000 });
    audioCtxRef.current = audioCtx;

    const source = audioCtx.createMediaStreamSource(stream);

    // 4️⃣ Audio processor
    const processor = audioCtx.createScriptProcessor(4096, 1, 1);
    processorRef.current = processor;

    source.connect(processor);
    processor.connect(audioCtx.destination);

    processor.onaudioprocess = (e) => {
      if (!ws || ws.readyState !== WebSocket.OPEN) return;

      const input = e.inputBuffer.getChannelData(0);
      const pcm16 = floatTo16BitPCM(input);

      ws.send(pcm16);
    };
  }

  function stop() {
    processorRef.current?.disconnect();
    audioCtxRef.current?.close();

    streamRef.current?.getTracks().forEach((t) => t.stop());
    wsRef.current?.close();

    processorRef.current = null;
    audioCtxRef.current = null;
    wsRef.current = null;
  }

  return { start, stop };
}
