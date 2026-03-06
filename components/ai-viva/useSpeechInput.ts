// //@ts-nocheck
// "use client";

// import { useEffect, useRef } from "react";

// export function useSpeechInput(
//   onInterim: (t: string) => void,
//   onFinal: (t: string) => void
// ) {
//   const wsRef = useRef<WebSocket | null>(null);
//   const mediaRecorderRef = useRef<MediaRecorder | null>(null);
//   const listeningRef = useRef(false);

//   useEffect(() => {
//     if (typeof window === "undefined") return;

//     // Connect to STT WebSocket server
//     // const ws = new WebSocket("wss://testing-zone-hx7q.onrender.com/");
//         const ws = new WebSocket("ws://localhost:3002");
//     wsRef.current = ws;

//     ws.onopen = () => {
//       console.log("🔌 Connected to STT server");
//     };

//     ws.onmessage = (event) => {
//       try {
//         const data = JSON.parse(event.data);
//         if (data.transcript) {
//           if (data.final) {
//             onFinal(data.transcript);
//           } else {
//             onInterim(data.transcript);
//           }
//         }
//       } catch (err) {
//         console.error("Failed to parse STT message:", err);
//       }
//     };

//     ws.onerror = (err) => {
//       console.error("WebSocket error:", err);
//     };

//     ws.onclose = () => {
//       console.log("🔌 Disconnected from STT server");
//     };

//     return () => {
//       ws.close();
//       mediaRecorderRef.current?.stop();
//     };
//   }, [onInterim, onFinal]);

//   async function start() {
//     if (listeningRef.current) return;

//     try {
//       const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
//       const recorder = new MediaRecorder(stream, {
//         mimeType: "audio/webm;codecs=opus" // or "audio/wav" if supported
//       });

//       recorder.ondataavailable = (event) => {
//         if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
//           wsRef.current.send(event.data);
//         }
//       };

//       recorder.onstop = () => {
//         listeningRef.current = false;
//         stream.getTracks().forEach(track => track.stop());
//       };

//       recorder.start(100); // Send data every 100ms
//       mediaRecorderRef.current = recorder;
//       listeningRef.current = true;
//       console.log("🎤 Mic started (server STT)");
//     } catch (err) {
//       console.error("Failed to start recording:", err);
//     }
//   }

//   function stop() {
//     mediaRecorderRef.current?.stop();
//     listeningRef.current = false;
//     console.log("🛑 Mic stopped");
//   }

//   return {
//     start,
//     stop,
//     isListening: () => listeningRef.current
//   };
// }


//@ts-nocheck
"use client";

// import { useEffect, useRef } from "react";

// export function useSpeechInput(
//   onInterim: (t: string) => void,
//   onFinal: (t: string) => void
// ) {
//   const wsRef = useRef<WebSocket | null>(null);
//   const mediaRecorderRef = useRef<MediaRecorder | null>(null);
//   const listeningRef = useRef(false);

//   const onInterimRef = useRef(onInterim);
//   const onFinalRef = useRef(onFinal);

//   onInterimRef.current = onInterim;
//   onFinalRef.current = onFinal;

//   useEffect(() => {
//     if (typeof window === "undefined") return;

//     const ws = new WebSocket("ws://localhost:3002");
//     wsRef.current = ws;

//     ws.onopen = () => {
//       console.log("🔌 Connected to STT server");
//     };

//     ws.onmessage = (event) => {
//       try {
//         const data = JSON.parse(event.data);

//         if (data.transcript) {
//           if (data.final) {
//             onFinalRef.current(data.transcript);
//           } else {
//             onInterimRef.current(data.transcript);
//           }
//         }
//       } catch (err) {
//         console.error("Failed to parse STT message:", err);
//       }
//     };

//     ws.onerror = (err) => {
//       console.error("WebSocket error:", err);
//     };

//     ws.onclose = () => {
//       console.log("🔌 Disconnected from STT server");
//     };

//     return () => {
//       ws.close();
//       mediaRecorderRef.current?.stop();
//     };
//   }, []); // ✅ runs once

//   async function start() {
//     if (listeningRef.current) return;

//     try {
//       const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

//       const recorder = new MediaRecorder(stream, {
//         mimeType: "audio/webm;codecs=opus"
//       });

//       recorder.ondataavailable = (event) => {
//         if (wsRef.current?.readyState === WebSocket.OPEN) {
//           wsRef.current.send(event.data);
//         }
//       };

//       recorder.onstop = () => {
//         listeningRef.current = false;
//         stream.getTracks().forEach((track) => track.stop());
//       };

//       recorder.start(100);
//       mediaRecorderRef.current = recorder;
//       listeningRef.current = true;

//       console.log("🎤 Mic started (server STT)");
//     } catch (err) {
//       console.error("Failed to start recording:", err);
//     }
//   }

//   function stop() {
//     mediaRecorderRef.current?.stop();
//     listeningRef.current = false;
//     console.log("🛑 Mic stopped");
//   }

//   return {
//     start,
//     stop,
//     isListening: () => listeningRef.current
//   };
// }


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

    const ws = new WebSocket("ws://localhost:3002");
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