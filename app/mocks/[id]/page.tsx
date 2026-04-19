"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

interface Question {
  id: string;
  questionText: string;
  options: string[];
  correctAnswer: number;
  questionImage?: string;
  explanation?: string;
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
  const [showConfirm, setShowConfirm] = useState(false);

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

  /* TIMER */
  useEffect(() => {
    if (!mock) return;

    const i = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          submit(); // 🔥 auto submit
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => clearInterval(i);
  }, [mock]);

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

  if (!mock) return <div className="h-screen flex items-center justify-center bg-black text-white">Loading...</div>;

  const q = mock.questions[currentQ];

  return (
    <>
      {/* SUBMIT MODAL */}
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

      <main className="h-screen flex bg-gradient-to-br from-black via-gray-900 to-black text-white">

        {/* LEFT */}
        <div className="w-[220px] p-4 border-r border-gray-800 flex flex-col">

          <div className="mb-6">
            <h1 className="text-lg font-bold">{mock.title}</h1>
            <p className="text-sm text-gray-400">
              {currentQ + 1}/{mock.questions.length}
            </p>
          </div>

          <div className="mb-6 text-2xl font-bold text-emerald-400">
            {format(timeLeft)}
          </div>

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

          <button
            onClick={() => setShowConfirm(true)}
            className="mt-4 py-2 bg-emerald-500 text-black rounded-xl"
          >
            Submit
          </button>
        </div>

        {/* RIGHT */}
        <div className="flex-1 p-10 flex items-center justify-center">

          <div className="w-full max-w-4xl grid gap-8 grid-cols-1 md:grid-cols-2">

            {/* QUESTION CARD */}
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-3xl p-6 shadow-xl">

              <h2 className="text-xl font-semibold mb-6">
                {q.questionText}
              </h2>

              <div className="space-y-3">
                {q.options.map((opt, i) => (
                  <button
                    key={i}
                    onClick={() => select(q.id, i)}
                    className={`w-full text-left p-3 rounded-xl transition ${
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

            {/* IMAGE */}
            {q.questionImage && (
              <div className="flex items-center justify-center">
                <img
                  src={q.questionImage}
                  className="max-h-[400px] rounded-xl border"
                />
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}