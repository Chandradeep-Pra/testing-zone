"use client";

import VivaVoiceAi from "@/components/ai-viva/VivaVoiceAi";
import { UseScribeDemo } from "@/components/ai-viva/UseScribeDemo";

export default function VivaSessionPage() {
  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100">
      <VivaVoiceAi />
      <div className="mt-8 p-4 bg-slate-800 rounded-xl max-w-xl mx-auto">
        <h2 className="text-lg font-bold mb-2">Test ElevenLabs Scribe v2 (Live Demo)</h2>
        <UseScribeDemo
          onPartial={(text) => console.log("Partial:", text)}
          onCommitted={(text) => console.log("Committed:", text)}
        />
      </div>
    </main>
  );
}