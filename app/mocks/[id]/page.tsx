"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

interface Question {
  id: string;
  questionText: string;
  options: string[];
  correctAnswer: number;
  questionImage?: string;
}

interface Mock {
  id: string;
  title: string;
  durationMinutes: number;
  questions: Question[];
}

export default function Page() {
  const { id } = useParams();
  const router = useRouter();

  const [mock, setMock] = useState<Mock | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [currentQ, setCurrentQ] = useState(0);

  const [timeLeft, setTimeLeft] = useState(0);

  // 🔥 BREAK STATES
  const [isBreak, setIsBreak] = useState(false);
  const [breakLeft, setBreakLeft] = useState(10 * 60);
  const [breakUsed, setBreakUsed] = useState(false);

  const [showConfirm, setShowConfirm] = useState(false);

  /* ───────── LOAD ───────── */

  useEffect(() => {
    const load = async () => {
      const res = await fetch(`/api/mocks/${id}`);
      const data = await res.json();

      setMock(data.mock);
      setTimeLeft(data.mock.durationMinutes * 60);

      const saved = localStorage.getItem(`mock-${id}-answers`);
      if (saved) setAnswers(JSON.parse(saved));
    };

    load();
  }, [id]);

  /* ───────── TIMER ───────── */

  useEffect(() => {
    if (!mock) return;

    const i = setInterval(() => {
      if (isBreak) {
        setBreakLeft((b) => {
          if (b <= 1) {
            setIsBreak(false);
            return 0;
          }
          return b - 1;
        });
      } else {
        setTimeLeft((t) => {
          if (t <= 1) {
            submit(); // auto submit
            return 0;
          }
          return t - 1;
        });
      }
    }, 1000);

    return () => clearInterval(i);
  }, [mock, isBreak]);

  /* ───────── ACTIONS ───────── */

  const select = (qid: string, index: number) => {
    const updated = { ...answers, [qid]: index };
    setAnswers(updated);
    localStorage.setItem(`mock-${id}-answers`, JSON.stringify(updated));

    if (currentQ < mock!.questions.length - 1) {
      setCurrentQ((p) => p + 1);
    }
  };

  const submit = () => {
    localStorage.setItem(`mock-${id}-final`, JSON.stringify(answers));
    router.push(`/mocks/${id}/result`);
  };

  const format = (s: number) =>
    `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  if (!mock)
    return (
      <div className="h-screen flex items-center justify-center bg-black text-white">
        Loading...
      </div>
    );

  const q = mock.questions[currentQ];

  return (
    <>
      {/* BREAK SCREEN */}
      {isBreak && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-50 flex flex-col items-center justify-center">
          <p className="text-gray-400 mb-2">Break Time</p>

          <h2 className="text-5xl font-bold text-emerald-400 mb-6">
            {format(breakLeft)}
          </h2>

          <button
            onClick={() => setIsBreak(false)}
            className="px-6 py-2 bg-white text-black rounded-xl"
          >
            Resume Test
          </button>
        </div>
      )}

      {/* SUBMIT CONFIRM */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center">
          <div className="bg-gray-900 p-6 rounded-2xl w-[320px] text-center">
            <h2 className="text-lg mb-4">Submit Test?</h2>

            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-2 bg-gray-700 rounded"
              >
                Cancel
              </button>

              <button
                onClick={submit}
                className="flex-1 py-2 bg-emerald-500 text-black rounded"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="h-screen w-screen flex bg-gradient-to-br from-black via-gray-900 to-black text-white overflow-hidden">

        {/* LEFT PANEL */}
        <div className="w-[220px] border-r border-gray-800 flex flex-col p-4">

          <div className="mb-6">
            <h1 className="text-base font-semibold truncate">
              {mock.title}
            </h1>

            <p className="text-xs text-gray-400">
              {currentQ + 1}/{mock.questions.length}
            </p>
          </div>

          {/* TIMER */}
          <div className="mb-6 text-2xl font-bold text-emerald-400">
            {format(isBreak ? breakLeft : timeLeft)}
          </div>

          {/* GRID */}
          <div className="grid grid-cols-5 gap-2 flex-1">
            {mock.questions.map((q, i) => (
              <button
                key={q.id}
                onClick={() => setCurrentQ(i)}
                className={`h-8 rounded ${
                  i === currentQ
                    ? "bg-white text-black"
                    : answers[q.id] !== undefined
                    ? "bg-emerald-500"
                    : "bg-gray-700"
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>

          {/* BREAK */}
          {!breakUsed && (
            <button
              onClick={() => {
                setIsBreak(true);
                setBreakUsed(true);
              }}
              className="mt-2 py-2 bg-yellow-500 text-black rounded-xl"
            >
              Take Break
            </button>
          )}

          {/* SUBMIT */}
          <button
            onClick={() => setShowConfirm(true)}
            className="mt-2 py-2 bg-emerald-500 text-black rounded-xl"
          >
            Submit
          </button>
        </div>

        {/* RIGHT PANEL */}
        <div className="flex-1 flex">

          <div
            key={q.id}
            className={`flex w-full h-full ${
              q.questionImage ? "flex-row" : "flex-col"
            }`}
          >

            {/* QUESTION */}
            <div className="flex-1 flex flex-col justify-between p-10">

              <div className="max-w-4xl">
                <h2 className="text-2xl font-semibold mb-10 leading-relaxed">
                  {q.questionText}
                </h2>

                <div className="grid md:grid-cols-2 gap-4">
                  {q.options.map((opt, i) => (
                    <button
                      key={i}
                      onClick={() => select(q.id, i)}
                      className={`p-4 rounded-xl text-left transition ${
                        answers[q.id] === i
                          ? "bg-emerald-500 text-black"
                          : "bg-gray-800 hover:bg-gray-700"
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              {/* PROGRESS */}
              <div className="h-[3px] bg-gray-800">
                <div
                  className="h-[3px] bg-emerald-400"
                  style={{
                    width: `${((currentQ + 1) / mock.questions.length) * 100}%`,
                  }}
                />
              </div>
            </div>

            {/* IMAGE */}
            {q.questionImage && (
              <div className="w-[45%] flex items-center justify-center p-6 border-l border-gray-800">
                <img
                  src={q.questionImage}
                  className="max-h-[85%] object-contain rounded-xl"
                />
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}