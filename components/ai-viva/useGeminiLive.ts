import { useState, useRef, useCallback, useEffect } from "react";
import { GoogleGenAI, Modality } from "@google/genai";
import { appPath } from "@/lib/app-path";

export function useGeminiLive(vivaCase: any, persona: any, candidateName: string) {
  const [active, setActive] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [amplitude, setAmplitude] = useState(0);
  const [history, setHistory] = useState<Array<{ question: string; answer: string }>>([]);
  
  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const micGainRef = useRef<GainNode | null>(null);
  const nextPlayTimeRef = useRef(0);
  const currentQuestionRef = useRef("");
  const currentAnswerRef = useRef("");

  const stopSession = useCallback(() => {
    sessionRef.current?.close();
    micStreamRef.current?.getTracks().forEach(track => track.stop());
    micGainRef.current?.disconnect();
    micGainRef.current = null;
    if (audioContextRef.current?.state !== 'closed') {
      audioContextRef.current?.close();
    }
    setActive(false);
    setAmplitude(0);
  }, []);

  const playAudioChunk = useCallback((base64Data: string) => {
    if (!audioContextRef.current) return;
    
    // Decode base64 to ArrayBuffer
    const binaryString = window.atob(base64Data);
    const len = binaryString.length;
    const bytes = new Int16Array(len / 2);
    for (let i = 0; i < len; i += 2) {
      bytes[i / 2] = (binaryString.charCodeAt(i + 1) << 8) | binaryString.charCodeAt(i);
    }
    
    // Convert to Float32 for Web Audio API
    const float32Data = new Float32Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) {
      float32Data[i] = bytes[i] / 32768.0;
    }

    const buffer = audioContextRef.current.createBuffer(1, float32Data.length, 24000);
    buffer.getChannelData(0).set(float32Data);
    
    const source = audioContextRef.current.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContextRef.current.destination);
    
    // Schedule playback for gapless audio
    const startTime = Math.max(audioContextRef.current.currentTime, nextPlayTimeRef.current);
    source.start(startTime);
    nextPlayTimeRef.current = startTime + buffer.duration;
  }, []);

  const startSession = useCallback(async () => {
    setConnecting(true);
    setTranscript("");
    setHistory([]);
    currentQuestionRef.current = "";
    currentAnswerRef.current = "";
    try {
      const res = await fetch(appPath("/api/viva/live/session"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vivaCase, persona }),
      });
      const payload = (await res.json()) as {
        token?: string;
        model?: string;
        error?: string;
      };
      if (!res.ok || !payload.token || !payload.model) {
        throw new Error(payload.error || "Unable to prepare the Gemini Live session.");
      }
      const { token, model } = payload;

      const live = new GoogleGenAI({ 
        apiKey: token,
        httpOptions: { apiVersion: "v1alpha" }
      });

      // 1. Setup Audio Context
      audioContextRef.current = new AudioContext({ sampleRate: 16000 });
      await audioContextRef.current.audioWorklet.addModule(appPath("/audio-processor.js"));

      // 2. Connect to Gemini Live
      sessionRef.current = await live.live.connect({
        model,
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {},
        },
        callbacks: {
          onmessage: (msg: any) => {
            const inputText = msg.serverContent?.inputTranscription?.text;
            if (typeof inputText === "string" && inputText.trim()) {
              currentAnswerRef.current += ` ${inputText.trim()}`;
            }

            // Handle Audio from AI
            if (msg.serverContent?.modelTurn?.parts) {
              let modelText = "";
              msg.serverContent.modelTurn.parts.forEach((part: any) => {
                if (part.inlineData?.mimeType?.includes("audio/pcm")) {
                  playAudioChunk(part.inlineData.data);
                }
                if (part.text) {
                  modelText += ` ${part.text}`;
                  setTranscript(prev => prev + " " + part.text);
                }
              });
              if (modelText.trim()) {
                if (currentAnswerRef.current.trim() && currentQuestionRef.current.trim()) {
                  setHistory((items) => [
                    ...items,
                    { question: currentQuestionRef.current.trim(), answer: currentAnswerRef.current.trim() },
                  ]);
                  currentAnswerRef.current = "";
                }
                currentQuestionRef.current = modelText.trim();
              }
            }
            
            // Handle Interruption (Server tells us if user interrupted)
            if (msg.serverContent?.interrupted) {
              nextPlayTimeRef.current = 0; // Reset playback queue
            }
          },
          onerror: (err: any) => {
            console.error("Live Error:", err);
            stopSession();
          },
          onclose: () => setActive(false),
        }
      });

      sessionRef.current.sendClientContent({
        turns: [{
          role: "user",
          parts: [{
            text: `Start the viva by saying exactly: "Hi ${candidateName}, how are you doing today ?" Then wait for the candidate's answer. Do not add any other words.`,
          }],
        }],
        turnComplete: true,
      });

      // 3. Setup Microphone and Stream to Gemini
      micStreamRef.current = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      const micSource = audioContextRef.current.createMediaStreamSource(micStreamRef.current);
      const processor = new AudioWorkletNode(audioContextRef.current, "audio-processor");
      
      processor.port.onmessage = (e) => {
        const pcmData = e.data; // Int16Array from processor
        let sum = 0;
        for (let index = 0; index < pcmData.length; index += 1) {
          const sample = pcmData[index] / 32768;
          sum += sample * sample;
        }
        setAmplitude(pcmData.length ? Math.min(1, Math.sqrt(sum / pcmData.length) * 4.5) : 0);
        // Convert to base64 for Gemini
        const base64 = btoa(String.fromCharCode(...new Uint8Array(pcmData.buffer)));
        sessionRef.current?.sendRealtimeInput([{
          mimeType: "audio/pcm;rate=16000",
          data: base64
        }]);
      };

      micSource.connect(processor);
  const silentGain = audioContextRef.current.createGain();
  silentGain.gain.value = 0;
  processor.connect(silentGain);
  silentGain.connect(audioContextRef.current.destination);
  micGainRef.current = silentGain;
      setActive(true);
    } catch (err) {
      console.error("Failed to start live session:", err);
      stopSession();
      throw err;
    } finally {
      setConnecting(false);
    }
  }, [candidateName, vivaCase, persona, playAudioChunk, stopSession]);

  useEffect(() => {
    return () => {
      stopSession();
    };
  }, [stopSession]);

  return {
    active,
    connecting,
    startSession,
    stopSession,
    transcript,
    amplitude,
    history,
  };
}
