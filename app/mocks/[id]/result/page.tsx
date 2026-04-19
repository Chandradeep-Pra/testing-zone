"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

export default function ResultPage() {
  const { id } = useParams();
  const [mock, setMock] = useState<any>(null);
  const [answers, setAnswers] = useState<any>({});

  useEffect(() => {
    const load = async () => {
      const res = await fetch(`/api/mocks/${id}`);
      const data = await res.json();
      setMock(data.mock);

      const saved = localStorage.getItem(`mock-${id}-final`);
      if (saved) setAnswers(JSON.parse(saved));
    };
    load();
  }, [id]);

  if (!mock) return null;

  let score = 0;

  mock.questions.forEach((q: any) => {
    if (answers[q.id] === q.correctAnswer) score++;
  });

  return (
    <main className="min-h-screen bg-black text-white p-10">

      {/* SCORE CARD */}
      <div className="max-w-xl mx-auto bg-gradient-to-br from-emerald-500 to-green-600 text-black p-6 rounded-3xl text-center shadow-xl">
        <h1 className="text-2xl font-bold">Your Score</h1>
        <p className="text-5xl font-bold mt-2">
          {score}/{mock.questions.length}
        </p>
      </div>

      {/* QUESTIONS */}
      <div className="max-w-3xl mx-auto mt-10 space-y-6">

        {mock.questions.map((q: any, i: number) => {
          const correct = q.correctAnswer;
          const selected = answers[q.id];

          return (
            <div key={q.id} className="bg-gray-900 p-5 rounded-2xl">

              <p className="mb-3 font-semibold">
                {i + 1}. {q.questionText}
              </p>

              <p className="text-sm text-gray-400">
                Your answer: {q.options[selected] || "Not answered"}
              </p>

              <p className="text-sm text-emerald-400">
                Correct answer: {q.options[correct]}
              </p>

              {q.explanation && (
                <p className="mt-2 text-sm text-gray-300">
                  {q.explanation.text}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </main>
  );
}