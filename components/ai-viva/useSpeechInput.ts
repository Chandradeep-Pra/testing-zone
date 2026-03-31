

//@ts-nocheck
// "use client";
// import { useEffect, useRef } from "react";

// export function useSpeechInput(onInterim, onFinal) {

//   const wsRef = useRef<WebSocket | null>(null);
//   const audioContextRef = useRef<AudioContext | null>(null);
//   const workletNodeRef = useRef<AudioWorkletNode | null>(null);

//   const silenceTimerRef = useRef<any>(null);
//   const accumulatedTranscriptRef = useRef("");

//   useEffect(() => {

//     const ws = new WebSocket("wss://testing-zone-hx7q.onrender.com/");
//     // const ws = new WebSocket("ws://localhost:3002");
//     ws.binaryType = "arraybuffer";

//     wsRef.current = ws;

//     ws.onmessage = (event) => {

//       const data = JSON.parse(event.data);

//       if (!data?.transcript) return;

//       // reset silence timer whenever speech arrives
//       resetSilenceTimer();

//       if (data.final) {

//         accumulatedTranscriptRef.current +=
//           " " + data.transcript.trim();

//       } else {

//         const interimText =
//           accumulatedTranscriptRef.current +
//           " " +
//           data.transcript;

//         onInterim(interimText.trim());

//       }

//     };

//     return () => {
//       ws.close();
//     };

//   }, []);

//   function resetSilenceTimer() {

//     if (silenceTimerRef.current) {
//       clearTimeout(silenceTimerRef.current);
//     }

//     silenceTimerRef.current = setTimeout(() => {

//       const finalText = accumulatedTranscriptRef.current.trim();

//       if (finalText) {
//         onFinal(finalText);
//         accumulatedTranscriptRef.current = "";
//       }

//     }, 4000); // 3.5 sec silence

//   }

//   async function start() {

//     const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

//     const audioContext = new AudioContext({
//       sampleRate: 16000
//     });

//     audioContextRef.current = audioContext;

//     await audioContext.audioWorklet.addModule("/audio-processor.js");

//     const source = audioContext.createMediaStreamSource(stream);

//     const worklet = new AudioWorkletNode(audioContext, "audio-processor");

//     workletNodeRef.current = worklet;

//     worklet.port.onmessage = (event) => {

//       if (wsRef.current?.readyState === WebSocket.OPEN) {
//         wsRef.current.send(event.data.buffer);
//       }

//     };

//     source.connect(worklet);

//     console.log("🎤 Mic streaming PCM");

//   }

//   function stop() {

//     if (silenceTimerRef.current) {
//       clearTimeout(silenceTimerRef.current);
//     }

//     workletNodeRef.current?.disconnect();
//     audioContextRef.current?.close();

//     console.log("🛑 Mic stopped");

//   }

//   return {
//     start,
//     stop
//   };
// }

//@ts-nocheck
"use client";

import { useRef } from "react";

export function useSpeechInput(onInterim, onFinal) {

  const wsRef = useRef(null);
  const transcriptBuffer = useRef("");

  const audioContextRef = useRef(null);
  const workletRef = useRef(null);
  const sourceRef = useRef(null);

  async function start() {
    console.log("🎤 Starting speech input");

    /* -------------------------
       Connect WebSocket once
    -------------------------- */

    if (!wsRef.current) {

      const ws = new WebSocket("wss://testing-zone-hx7q.onrender.com");
      // const ws = new WebSocket("ws://localhost:3002");
      ws.binaryType = "arraybuffer";

      wsRef.current = ws;

      ws.onopen = () => {
        console.log("🔌 STT socket connected");
      };

      ws.onclose = () => {
        console.log("🔌 STT socket closed");
      };

      ws.onmessage = (event) => {

        const data = JSON.parse(event.data);
        if (!data) return;

        /* -------------------------
           TRANSCRIPT
        -------------------------- */

        if (data.transcript) {

          if (data.final) {

            transcriptBuffer.current +=
              " " + data.transcript.trim();

            console.log("✅ Final segment:", data.transcript);

          } else {

            const interim =
              transcriptBuffer.current +
              " " +
              data.transcript;

            onInterim(interim.trim());

          }

        }

        /* -------------------------
           SPEECH END
        -------------------------- */

        if (data.speechEnded) {

          console.log("🛑 Speech end received");

          const finalText =
            transcriptBuffer.current.trim();

          console.log("📨 Submitting answer:", finalText);

          if (finalText) {
            onFinal(finalText);
          }

          transcriptBuffer.current = "";

        }

      };

    }

    /* -------------------------
       Mic capture
    -------------------------- */

    const stream =
      await navigator.mediaDevices.getUserMedia({ audio: true });

    const audioContext = new AudioContext({
      sampleRate: 16000
    });

    audioContextRef.current = audioContext;

    await audioContext.audioWorklet.addModule("/audio-processor.js");

    const source = audioContext.createMediaStreamSource(stream);
    sourceRef.current = source;

    const worklet =
      new AudioWorkletNode(audioContext, "audio-processor");

    workletRef.current = worklet;

    worklet.port.onmessage = (event) => {

      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(event.data);
      }

    };

    source.connect(worklet);

    console.log("🎧 Mic streaming to STT");

  }

  /* -------------------------
     Stop mic only
  -------------------------- */

  function stop() {

    console.log("🎤 Stopping microphone");

    if (workletRef.current) {
      workletRef.current.disconnect();
      workletRef.current = null;
    }

    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

  }

  /* -------------------------
     Close socket (only when viva ends)
  -------------------------- */

  function closeSocket() {

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

  }

  return {
    start,
    stop,
    closeSocket
  };

}
