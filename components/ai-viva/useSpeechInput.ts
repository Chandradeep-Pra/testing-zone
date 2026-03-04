// //@ts-nocheck
// "use client";

// import { useEffect, useRef } from "react";

// export function useSpeechInput(
//   onInterim: (t: string) => void,
//   onFinal: (t: string) => void
// ) {
//   const recognitionRef = useRef<SpeechRecognition | null>(null);
//   const listeningRef = useRef(false);

//   useEffect(() => {
//     if (typeof window === "undefined") return;

//     const SpeechRecognition =
//       (window as any).SpeechRecognition ||
//       (window as any).webkitSpeechRecognition;

//     if (!SpeechRecognition) {
//       console.warn("SpeechRecognition not supported");
//       return;
//     }

//     const rec: SpeechRecognition = new SpeechRecognition();

//     rec.lang = "en-US";
//     rec.interimResults = true;
//     rec.continuous = true;

//     rec.onstart = () => {
//       listeningRef.current = true;
//       console.log("🎤 Mic started");
//     };

//     rec.onend = () => {
//       listeningRef.current = false;
//       console.log("🛑 Mic ended");
//     };

//     rec.onerror = (e: any) => {
//       listeningRef.current = false;

//       if (e.error === "aborted") {
//         // benign — controlled lifecycle
//         return;
//       }

//       console.error("Speech error:", e.error);
//     };

//     rec.onresult = (e: SpeechRecognitionEvent) => {
//   let interim = "";
//   let final = "";

//   for (let i = e.resultIndex; i < e.results.length; i++) {
//     const res = e.results[i];
//     const text = res[0].transcript;

//     if (res.isFinal) final += text;
//     else interim += text;
//   }

//   onInterim(interim.trim());

//   if (final) onFinal(final.trim());
// };

//     recognitionRef.current = rec;

//     return () => {
//       // ❌ DO NOT abort here
//       recognitionRef.current = null;
//     };
//   }, [onInterim, onFinal]);

//   function start() {
//     const rec = recognitionRef.current;
//     if (!rec || listeningRef.current) return;

//     try {
//       rec.start();
//     } catch {
//       // ignore
//     }
//   }

//   function stop() {
//     recognitionRef.current?.stop();
//   }

//   return {
//     start,
//     stop,
//     isListening: () => listeningRef.current
//   };
// }


//@ts-nocheck
"use client";

import { useRef } from "react";

export function useSpeechInput(onInterim, onFinal) {

  const wsRef = useRef(null);
  const audioContextRef = useRef(null);
  const processorRef = useRef(null);
  const sourceRef = useRef(null);

  async function start() {

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    const audioContext = new AudioContext({ sampleRate: 16000 });
    audioContextRef.current = audioContext;

    const source = audioContext.createMediaStreamSource(stream);
    sourceRef.current = source;

    const processor = audioContext.createScriptProcessor(4096, 1, 1);
    processorRef.current = processor;

    wsRef.current = new WebSocket("ws://localhost:3002");

    wsRef.current.onmessage = (event) => {

      const data = JSON.parse(event.data);

      if (data.final) onFinal(data.transcript);
      else onInterim(data.transcript);

    };

    processor.onaudioprocess = (event) => {

      const input = event.inputBuffer.getChannelData(0);

      const pcm16 = convertFloat32ToInt16(input);

      if (wsRef.current?.readyState === 1) {
        wsRef.current.send(pcm16);
      }

    };

    source.connect(processor);
    processor.connect(audioContext.destination);

  }

  function stop() {

    processorRef.current?.disconnect();
    sourceRef.current?.disconnect();
    audioContextRef.current?.close();
    wsRef.current?.close();

  }

  return { start, stop };

}

function convertFloat32ToInt16(buffer) {

  const l = buffer.length;
  const buf = new Int16Array(l);

  for (let i = 0; i < l; i++) {
    buf[i] = Math.min(1, buffer[i]) * 0x7fff;
  }

  return buf.buffer;

}