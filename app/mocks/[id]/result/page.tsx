"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type MockQuestion = {
  id: string;
  questionText: string;
  options: Record<string, string>;
  correctAnswer: string;
  explanation?: {
    text?: string;
    image?: string;
  };
};

type MockDetail = {
  questions: MockQuestion[];
};

export default function ResultPage() {
  const { id } = useParams<{ id: string }>();

  const [mock, setMock] = useState<MockDetail | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const res = await fetch(`/api/mocks/${id}`);
      const data = (await res.json()) as { mock?: MockDetail };
      setMock(data.mock || null);

      const saved = localStorage.getItem(`mock-${id}-final`);
      if (saved) {
        setAnswers(JSON.parse(saved) as Record<string, string>);
      }
    };

    void load();
  }, [id]);

  if (!mock) return null;

  let score = 0;

  mock.questions.forEach((question) => {
    if (answers[question.id] === question.correctAnswer) score++;
  });

  return (
    <>
      {preview && (
        <div
          onClick={() => setPreview(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
        >
          <Image
            src={preview}
            alt="Explanation preview"
            width={1200}
            height={900}
            className="max-h-[90%] max-w-[90%] object-contain"
          />
        </div>
      )}

      <main className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black px-6 py-10 text-white">
        <div className="mx-auto max-w-xl rounded-3xl bg-gradient-to-br from-emerald-500 to-green-600 p-6 text-center text-black shadow-xl">
          <h1 className="text-2xl font-bold">Your Score</h1>
          <p className="mt-2 text-5xl font-bold">
            {score}/{mock.questions.length}
          </p>
        </div>

        <div className="mx-auto mt-10 max-w-5xl space-y-6">
          {mock.questions.map((question, index) => {
            const correct = question.correctAnswer;
            const selected = answers[question.id];

            return (
              <div
                key={question.id}
                className="rounded-2xl border border-gray-800 bg-gray-900/80 p-6"
              >
                <p className="mb-4 text-lg font-semibold leading-relaxed">
                  {index + 1}. {question.questionText}
                </p>

                <div className="mb-4 space-y-1 text-sm">
                  <p className="text-gray-400">
                    Your answer:{" "}
                    <span
                      className={selected === correct ? "text-emerald-400" : "text-red-400"}
                    >
                      {question.options[selected] || "Not answered"}
                    </span>
                  </p>

                  <p className="text-emerald-400">
                    Correct answer: {question.options[correct]}
                  </p>
                </div>

                {question.explanation && (
                  <div className="mt-4 border-t border-gray-800 pt-4">
                    {question.explanation.text && (
                      <p className="mb-4 text-sm leading-relaxed text-gray-300">
                        {question.explanation.text}
                      </p>
                    )}

                    {question.explanation.image && (
                      <div className="flex justify-center">
                        <button
                          type="button"
                          onClick={() => setPreview(question.explanation?.image || null)}
                          className="cursor-zoom-in"
                        >
                          <Image
                            src={question.explanation.image}
                            alt="Explanation"
                            width={900}
                            height={600}
                            className="max-h-[300px] rounded-xl border border-gray-700 object-contain transition hover:scale-[1.02]"
                          />
                        </button>
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
