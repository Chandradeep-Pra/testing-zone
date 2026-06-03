"use client";

import { CheckCircle2, ShieldCheck, Trophy, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import toast from "react-hot-toast";

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
  const [submittedAttempt, setSubmittedAttempt] = useState(false);

  useEffect(() => {
    const load = async () => {
      const publicRes = await fetch(`/api/public/mocks/${id}`);
      if (publicRes.ok) {
        const publicData = (await publicRes.json()) as { mock?: MockDetail };
        setMock(publicData.mock || null);
      } else {
        const res = await fetch(`/api/mocks/${id}`);
        const data = (await res.json()) as { mock?: MockDetail };
        setMock(data.mock || null);
      }

      const saved = localStorage.getItem(`mock-${id}-final`);
      if (saved) {
        setAnswers(JSON.parse(saved) as Record<string, string>);
      }
    };

    void load();
  }, [id]);

  const score = mock
    ? mock.questions.reduce(
        (total, question) =>
          answers[question.id] === question.correctAnswer ? total + 1 : total,
        0
      )
    : 0;

  useEffect(() => {
    if (!mock || submittedAttempt) {
      return;
    }

    const alreadySubmitted = sessionStorage.getItem(`mock-${id}-attempt-submitted`);
    if (alreadySubmitted === "true") {
      setSubmittedAttempt(true);
      return;
    }

    const storedUser = localStorage.getItem("mockUser");
    if (!storedUser) {
      return;
    }

    const parsedUser = JSON.parse(storedUser) as { name?: string; email?: string };
    if (!parsedUser.name || !parsedUser.email) {
      return;
    }

    const marks = Math.max(0, Math.min(score, mock.questions.length));

    const submitAttempt = async () => {
      toast.loading("Submitting mock attempt...", { id: "mock-attempt" });

      try {
        const res = await fetch(`/api/mocks/${id}/attempts`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: parsedUser.name,
            email: parsedUser.email,
            marks,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          const message =
            typeof data?.error === "string" ? data.error : "Failed to submit mock attempt";
          throw new Error(message);
        }

        localStorage.setItem(
          `mock-${id}-attempt-summary`,
          JSON.stringify({
            mockId: id,
            title: mock.title || "Grand Mock",
            name: parsedUser.name,
            email: parsedUser.email,
            marks,
            attemptsCount: data.attemptsCount ?? null,
            attempt: data.attempt ?? null,
          })
        );
        sessionStorage.setItem(`mock-${id}-attempt-submitted`, "true");
        setSubmittedAttempt(true);
        toast.success("Mock submitted successfully", { id: "mock-attempt" });
      } catch (error) {
        console.error("Mock attempt submission failed:", error);
        toast.error(
          error instanceof Error ? error.message : "Failed to submit mock attempt",
          { id: "mock-attempt" }
        );
      }
    };

    void submitAttempt();
  }, [id, mock, score, submittedAttempt]);

  if (!mock) {
    return null;
  }

  return (
    <>
      {preview && (
        <div
          onClick={() => setPreview(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 p-4"
        >
          <img
            src={preview}
            alt="Explanation preview"
            className="max-h-[90%] max-w-[90%] object-contain"
          />
        </div>
      )}

      <main className="urologics-shell px-6 py-8">
        <div className="mx-auto max-w-6xl space-y-6">
          <header className="urologics-header flex flex-wrap items-center justify-between gap-4 px-6 py-5">
            <UrologicsBrand product="Grand Mocks" tag="Session results" />
            <div className="urologics-chip">Completed Review</div>
          </header>

          <section className="grid gap-6 lg:grid-cols-[1fr_0.38fr]">
            <div className="urologics-panel p-8">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-50 text-[#0f7896]">
                  <ShieldCheck size={22} />
                </div>
                <div>
                  <div className="text-xs uppercase tracking-[0.22em] text-[#0f7896]">Urologics Mock Review</div>
                  <h1 className="mt-3 text-3xl font-semibold text-[#071014]">{mock.title || "Grand Mock"}</h1>
                  <p className="mt-3 text-sm leading-7 text-[#071014]/65">
                    Analysis of your performance in this mock session, along with explanations for each question. 
                  </p>
                </div>
              </div>
            </div>

            <div className="urologics-panel flex flex-col items-center justify-center p-8 text-center">
              <Trophy className="text-[#0f7896]" size={22} />
              <div className="mt-4 text-5xl font-semibold text-[#0f7896]">
                {score}/{mock.questions.length}
              </div>
              <div className="mt-2 text-sm text-[#071014]/65">Final mock score</div>
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
                    <div className={`mt-1 rounded-full p-2 ${isCorrect ? "bg-cyan-50 text-[#0f7896]" : "bg-rose-50 text-rose-600"}`}>
                      {isCorrect ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                    </div>
                    <div className="flex-1">
                      <div className="text-lg font-semibold leading-8 text-[#071014]">
                        {index + 1}. {question.questionText}
                      </div>
                      <div className="mt-4 space-y-2 text-sm leading-6">
                        <p className="text-[#071014]/65">
                          Your answer:{" "}
                          <span className={isCorrect ? "text-[#0f7896]" : "text-rose-600"}>
                            {question.options[selected] || "Not answered"}
                          </span>
                        </p>
                        <p className="text-[#071014]/70">
                          Correct answer: <span className="text-[#0f7896]">{question.options[correct]}</span>
                        </p>
                      </div>

                      {question.explanation && (
                        <div className="urologics-subpanel mt-5 p-4">
                          {question.explanation.text && (
                            <p className="text-sm leading-7 text-[#071014]/75">{question.explanation.text}</p>
                          )}

                          {question.explanation.image && (
                            <div className="mt-4 flex justify-center">
                              <button type="button" onClick={() => setPreview(question.explanation?.image || null)}>
                                <img
                                  src={question.explanation.image}
                                  alt="Explanation"
                                  className="max-h-[300px] rounded-[28px] object-contain transition hover:scale-[1.02]"
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
