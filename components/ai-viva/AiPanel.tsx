"use client";

import React, { useEffect, useState } from "react";
import SiriWaveFrom from "./SiriWaveForm";
import SiriWaveComponent from "./SiriWaveForm";

type Props = {
speaking: boolean;
thinking?: boolean;
transcript: string;
exhibit?: React.ReactNode;
amplitude?: number;
};

const fillers = [
  "Alright, let me consider that.",
  "Okay, I understand.",
  "Hmm, let me think about that.",
  "Got it, one moment.",
  "Right, I see.",
  "Okay, processing your response.",
  "I understand what you're saying.",
  "Alright, just a second.",
  "Let me go through that.",
  "Okay, thinking it through.",
  "Right, let me consider your answer.",
  "Understood, give me a moment.",
];

export function AiPanel({
speaking,
thinking = false,
transcript,
exhibit,
amplitude = 0,
}: Props) {

const [activeExhibit, setActiveExhibit] = useState<React.ReactNode | null>(null);
const [filler, setFiller] = useState("");

/* -------------------------
Exhibit Logic
------------------------- */

useEffect(() => {
if (!speaking && !thinking && exhibit) {
setActiveExhibit(exhibit);
} else {
setActiveExhibit(null);
}
}, [exhibit, speaking, thinking]);

/* -------------------------
Rotating Thinking Fillers
------------------------- */

useEffect(() => {
if (!thinking || speaking) {
setFiller("");
return;
}


let i = 0;

const updateFiller = () => {
  setFiller(fillers[i % fillers.length]);
  i++;
};

updateFiller();

const interval = setInterval(updateFiller, 1800);

return () => clearInterval(interval);


}, [thinking, speaking]);

const audioScale = 1 + amplitude * 0.25;

return (
<div
className={`relative h-full w-full rounded-xl border overflow-hidden bg-slate-950
      ${
        speaking
          ? "border-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.35)]"
          : thinking
          ? "border-yellow-400 shadow-[0_0_30px_rgba(234,179,8,0.25)]"
          : "border-slate-800"
      }`}
>


  {/* Header */}
  <div className="absolute top-4 left-4 text-xs uppercase tracking-widest text-slate-400">
    AI Examiner
  </div>

  {/* Status */}
  <div className="absolute top-4 right-4 text-xs">
    {speaking && <span className="text-emerald-400">Speaking</span>}
    {!speaking && thinking && (
      <span className="text-yellow-400">Thinking</span>
    )}
  </div>

  {/* CENTER */}
  <div className="absolute inset-0 flex items-center justify-center bg-slate-900">

  {/* SIRI WAVE FOR ALL STATES */}
  <div className="flex items-center justify-center scale-110">

    {/* THINKING → slow + subtle */}
    {thinking && (
      <SiriWaveComponent amplitude={0.2} speed={0.02} />
    )}

    {/* SPEAKING → reactive */}
    {speaking && (
      <SiriWaveComponent amplitude={amplitude} speed={0.08} />
    )}

    {/* IDLE / LISTENING → soft breathing */}
    {!thinking && !speaking && (
      <SiriWaveComponent amplitude={0.1} speed={0.03} />
    )}

  </div>

</div>

  {/* Exhibit */}
  {activeExhibit && (
    <div className="absolute inset-0 z-20 bg-black/70 backdrop-blur-sm flex items-center justify-center p-6">
      {activeExhibit}
    </div>
  )}

  {/* Transcript */}
  {/* {(transcript || thinking) && (
    <div
      className="absolute bottom-8 left-1/2 -translate-x-1/2
      max-w-2xl w-[80%]
      bg-black/70 backdrop-blur
      px-6 py-4 rounded-xl
      text-base text-center text-slate-100
      border border-slate-800
      max-h-40 overflow-y-auto"
    >
      {thinking ? filler : transcript}
    </div>
  )} */}

</div>


);
}
