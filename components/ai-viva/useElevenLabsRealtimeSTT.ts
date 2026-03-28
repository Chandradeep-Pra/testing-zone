// File removed: use the official ElevenLabs SDK and UseScribeDemo instead.
import { useRef } from "react";

// Docs: https://docs.elevenlabs.io/api-reference/streaming-speech-to-text
// This hook streams mic audio to ElevenLabs Scribe v2 WebSocket and provides real-time transcripts

export function useElevenLabsRealtimeSTT({
  onInterim,
  onFinal,
  apiKey,
  model = "latest"
}: {
  onInterim: (text: string) => void;
  onFinal: (text: string) => void;
  apiKey: string;
  model?: string;
}) {
  const wsRef = useRef<WebSocket | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  async function start() {
    // 1. Open ElevenLabs Scribe v2 WebSocket
    const wsUrl = `wss://api.elevenlabs.io/v1/speech-to-text/ws?model=${model}`;
    console.log("[ElevenLabs STT] Connecting to WebSocket:", wsUrl);
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;
    ws.binaryType = "arraybuffer";
    ws.onopen = () => {
      console.log("[ElevenLabs STT] WebSocket connected");
      ws.send(JSON.stringify({
        api_key: apiKey,
        // Add more config if needed
      }));
    };
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("[ElevenLabs STT] Message:", data);
        if (data.text && data.is_final === false) onInterim(data.text);
        if (data.text && data.is_final === true) onFinal(data.text);
      } catch (err) {
        console.error("[ElevenLabs STT] Failed to parse message:", event.data, err);
      }
    };
    ws.onerror = (e) => {
      console.error("[ElevenLabs STT] WebSocket error:", e);
    };
    ws.onclose = (event) => {
      console.warn("[ElevenLabs STT] WebSocket closed:", event);
    };

    // 2. Get mic audio
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const audioCtx = new AudioContext({ sampleRate: 16000 });
      audioCtxRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const processor = audioCtx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;
      source.connect(processor);
      processor.connect(audioCtx.destination);
      processor.onaudioprocess = (e) => {
        if (!ws || ws.readyState !== WebSocket.OPEN) return;
        const input = e.inputBuffer.getChannelData(0);
        // Convert Float32 to Int16 PCM
        const pcm = new Int16Array(input.length);
        for (let i = 0; i < input.length; i++) {
          let s = Math.max(-1, Math.min(1, input[i]));
          pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
        }
        ws.send(pcm.buffer);
      };
    } catch (err) {
      console.error("[ElevenLabs STT] Microphone access error:", err);
    }
  }

  function stop() {
    processorRef.current?.disconnect();
    audioCtxRef.current?.close();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    wsRef.current?.close();
  }

  return { start, stop };
}
