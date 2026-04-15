"use client";

import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-black text-white">

      {/* HERO */}
      <section className="px-6 pt-28 pb-20 max-w-6xl mx-auto text-center">
        <h1 className="text-5xl md:text-6xl font-bold leading-tight mb-6">
          Realistic FRCS Viva Simulation
          <span className="block text-emerald-400 mt-2">
            Powered by Adaptive AI
          </span>
        </h1>

        <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-10">
          Practice like you're in the real exam. Face a dynamic examiner,
          interpret clinical scenarios, and receive structured feedback —
          all in one seamless viva experience.
        </p>

        <button
          onClick={() => router.push("/ai-viva/cases")}
          className="bg-emerald-600 hover:bg-emerald-500 px-8 py-4 rounded-xl text-lg font-semibold transition shadow-lg hover:shadow-xl"
        >
          Start Viva Practice
        </button>
      </section>

      {/* BENTO GRID */}
      <section className="px-6 pb-24 max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-5">

        {/* BIG CARD */}
        <div className="md:col-span-2 bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h2 className="text-2xl font-semibold mb-3">
            What This Platform Does
          </h2>
          <p className="text-gray-400 text-sm leading-relaxed">
            This system simulates a real FRCS-style viva examination where an AI examiner
            interacts with you dynamically. Questions evolve based on your answers,
            covering clinical reasoning, investigations, interpretation, and management.
            The goal is to replicate real exam pressure and thinking patterns.
          </p>
        </div>

        {/* SIDE CARD */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h3 className="font-semibold mb-2">🎯 Outcome Focused</h3>
          <p className="text-gray-400 text-sm">
            Not just practice — targeted questioning ensures all key objectives are covered.
          </p>
        </div>

        {/* HOW IT WORKS */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h3 className="font-semibold mb-3">⚙️ How It Works</h3>
          <ul className="text-gray-400 text-sm space-y-2">
            <li>• Choose a clinical case</li>
            <li>• Answer adaptive viva questions</li>
            <li>• Interpret images when required</li>
            <li>• Progress through exam stages</li>
          </ul>
        </div>

        {/* VIVA RULES */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h3 className="font-semibold mb-3">📋 Viva Rules</h3>
          <ul className="text-gray-400 text-sm space-y-2">
            <li>• Single question at a time</li>
            <li>• Progressive difficulty</li>
            <li>• No hints from examiner</li>
            <li>• Real exam tone & structure</li>
          </ul>
        </div>

        {/* PROFESSIONALISM */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h3 className="font-semibold mb-3">🩺 Professional Standards</h3>
          <p className="text-gray-400 text-sm">
            Designed to assess not only knowledge but also clinical judgement,
            structured thinking, and professional communication.
          </p>
        </div>

        {/* IMAGE + INTERPRETATION */}
        <div className="md:col-span-2 bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h3 className="font-semibold mb-3">🖼️ Image-Based Discussion</h3>
          <p className="text-gray-400 text-sm">
            When appropriate, you’ll be presented with clinical images such as CT scans
            or cystoscopy findings. You are expected to interpret them — just like in
            the real viva. The system never reveals answers upfront.
          </p>
        </div>

        {/* REPORT */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h3 className="font-semibold mb-3">📧 Detailed Report</h3>
          <p className="text-gray-400 text-sm">
            After completion, a structured performance report is generated and
            sent to your email, highlighting strengths and areas to improve.
          </p>
        </div>

      </section>

      {/* FINAL CTA */}
      <section className="px-6 pb-28 text-center">
        <h2 className="text-3xl font-bold mb-6">
          Experience a Real Viva — Before the Real One
        </h2>

        <p className="text-gray-400 mb-8">
          Prepare with confidence through realistic, adaptive practice.
        </p>

        <button
          onClick={() => router.push("/ai-viva/cases")}
          className="bg-emerald-600 hover:bg-emerald-500 px-8 py-4 rounded-xl text-lg font-semibold transition shadow-lg hover:shadow-xl"
        >
          Go to Cases
        </button>
      </section>

    </main>
  );
}