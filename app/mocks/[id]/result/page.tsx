"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

export default function ResultPage() {
  const { id } = useParams();

  const [mock, setMock] = useState<any>(null);
  const [answers, setAnswers] = useState<any>({});
  const [preview, setPreview] = useState<string | null>(null);

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
    <>
      {/* IMAGE PREVIEW */}
      {preview && (
        <div
          onClick={() => setPreview(null)}
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center"
        >
          <img
            src={preview}
            className="max-h-[90%] max-w-[90%] object-contain"
          />
        </div>
      )}

      <main className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white px-6 py-10">

        {/* SCORE CARD */}
        <div className="max-w-xl mx-auto bg-gradient-to-br from-emerald-500 to-green-600 text-black p-6 rounded-3xl text-center shadow-xl">
          <h1 className="text-2xl font-bold">Your Score</h1>
          <p className="text-5xl font-bold mt-2">
            {score}/{mock.questions.length}
          </p>
        </div>

        {/* QUESTIONS */}
        <div className="max-w-5xl mx-auto mt-10 space-y-6">

          {mock.questions.map((q: any, i: number) => {
            const correct = q.correctAnswer;
            const selected = answers[q.id];

            return (
              <div
                key={q.id}
                className="bg-gray-900/80 border border-gray-800 rounded-2xl p-6"
              >

                {/* QUESTION */}
                <p className="mb-4 font-semibold text-lg leading-relaxed">
                  {i + 1}. {q.questionText}
                </p>

                {/* ANSWERS */}
                <div className="mb-4 space-y-1 text-sm">
                  <p className="text-gray-400">
                    Your answer:{" "}
                    <span
                      className={
                        selected === correct
                          ? "text-emerald-400"
                          : "text-red-400"
                      }
                    >
                      {q.options[selected] || "Not answered"}
                    </span>
                  </p>

                  <p className="text-emerald-400">
                    Correct answer: {q.options[correct]}
                  </p>
                </div>

                {/* EXPLANATION */}
                {q.explanation && (
                  <div className="mt-4 border-t border-gray-800 pt-4">

                    {/* TEXT */}
                    {q.explanation.text && (
                      <p className="text-gray-300 text-sm leading-relaxed mb-4">
                        {q.explanation.text}
                      </p>
                    )}

                    {/* IMAGE */}
                    {q.explanation.image && (
                      <div className="flex justify-center">
                        <img
                          src={q.explanation.image}
                          onClick={() => setPreview(q.explanation.image)}
                          className="max-h-[300px] object-contain rounded-xl border border-gray-700 cursor-zoom-in hover:scale-[1.02] transition"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </main>
    </>
  );
}