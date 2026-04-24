"use client";

import Image from "next/image";
import { CheckCircle2, ShieldCheck, Trophy, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

import UrologicsBrand from "@/components/brand/UrologicsBrand";

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
  title?: string;
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

  if (!mock) {
    return null;
  }

  let score = 0;
  mock.questions.forEach((question) => {
    if (answers[question.id] === question.correctAnswer) {
      score += 1;
    }
  });

  return (
    <>
      {preview && (
        <div
          onClick={() => setPreview(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 p-4"
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

      <main className="urologics-shell px-6 py-8">
        <div className="mx-auto max-w-6xl space-y-6">
          <header className="urologics-panel flex flex-wrap items-center justify-between gap-4 px-6 py-5">
            <UrologicsBrand product="Grand Mocks" tag="Session results" />
            <div className="urologics-chip">Completed Review</div>
          </header>

          <section className="grid gap-6 lg:grid-cols-[1fr_0.38fr]">
            <div className="urologics-panel p-8">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-400/10 text-teal-300">
                  <ShieldCheck size={22} />
                </div>
                <div>
                  <div className="text-xs uppercase tracking-[0.24em] text-slate-500">Urologics Mock Review</div>
                  <h1 className="mt-3 text-3xl font-semibold text-white">{mock.title || "Grand Mock"}</h1>
                  <p className="mt-3 text-sm leading-7 text-slate-400">
                    A cleaner, branded answer review screen for post-session analysis.
                  </p>
                </div>
              </div>
            </div>

            <div className="urologics-panel flex flex-col items-center justify-center p-8 text-center">
              <Trophy className="text-teal-300" size={22} />
              <div className="mt-4 text-5xl font-semibold text-teal-300">
                {score}/{mock.questions.length}
              </div>
              <div className="mt-2 text-sm text-slate-400">Final mock score</div>
            </div>
          </section>

          <section className="space-y-5">
            {mock.questions.map((question, index) => {
              const correct = question.correctAnswer;
              const selected = answers[question.id];
              const isCorrect = selected === correct;

              return (
                <article key={question.id} className="urologics-panel p-6">
                  <div className="flex items-start gap-3">
                    <div className={`mt-1 rounded-full p-2 ${isCorrect ? "bg-teal-400/10 text-teal-300" : "bg-rose-400/10 text-rose-300"}`}>
                      {isCorrect ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                    </div>
                    <div className="flex-1">
                      <div className="text-lg font-semibold leading-8 text-white">
                        {index + 1}. {question.questionText}
                      </div>
                      <div className="mt-4 space-y-2 text-sm leading-6">
                        <p className="text-slate-400">
                          Your answer:{" "}
                          <span className={isCorrect ? "text-teal-300" : "text-rose-300"}>
                            {question.options[selected] || "Not answered"}
                          </span>
                        </p>
                        <p className="text-slate-300">
                          Correct answer: <span className="text-teal-300">{question.options[correct]}</span>
                        </p>
                      </div>

                      {question.explanation && (
                        <div className="urologics-subpanel mt-5 p-4">
                          {question.explanation.text && (
                            <p className="text-sm leading-7 text-slate-300">{question.explanation.text}</p>
                          )}

                          {question.explanation.image && (
                            <div className="mt-4 flex justify-center">
                              <button type="button" onClick={() => setPreview(question.explanation?.image || null)}>
                                <Image
                                  src={question.explanation.image}
                                  alt="Explanation"
                                  width={900}
                                  height={600}
                                  className="max-h-[300px] rounded-2xl border border-white/10 object-contain transition hover:scale-[1.02]"
                                />
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        </div>
      </main>
    </>
  );
}
