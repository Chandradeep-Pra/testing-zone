"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import ReviewAnswers, { type MockDetail, type MockQuestion, type RankComparison } from "@/components/mocks/ReviewAnswers";
import { appPath } from "@/lib/app-path";
import { useAuth } from "@/components/auth/AuthProvider";
import { getMockCandidateEmail, readCompletedMockAttempt, resolveMockAttempt } from "@/lib/mock-session";
import { firstAttemptRankings, mockEffectiveRank } from "@/lib/mock-ranking";

function normalizeOption(option: unknown) {
  return String(option ?? "").replace(/\s+/g, " ").trim();
}

function normalizeQuestion(question: unknown, index: number): MockQuestion {
  const source = (question && typeof question === "object" ? question : {}) as Record<string, unknown>;
  const explanation =
    source.explanation && typeof source.explanation === "object"
      ? (source.explanation as Record<string, unknown>)
      : null;

  return {
    id: typeof source.id === "string" ? source.id : `question-${index + 1}`,
    questionText: typeof source.questionText === "string" ? source.questionText : "",
    options: Array.isArray(source.options)
      ? source.options.map(normalizeOption).filter((option) => option.length > 0)
      : [],
    correctAnswer:
      typeof source.correctAnswer === "number"
        ? source.correctAnswer
        : Number.isFinite(Number(source.correctAnswer))
          ? Number(source.correctAnswer)
          : -1,
    questionImage:
      typeof source.questionImage === "string" && source.questionImage.trim() ? source.questionImage : undefined,
    explanation: explanation
      ? {
          text: typeof explanation.text === "string" ? explanation.text : undefined,
          image: typeof explanation.image === "string" ? explanation.image : undefined,
        }
      : undefined,
  };
}

function normalizeMock(payload: unknown): MockDetail | null {
  if (!payload || typeof payload !== "object") return null;
  const source = payload as Record<string, unknown>;
  return {
    title: typeof source.title === "string" ? source.title : "Grand Mock",
    accessType: source.accessType === "public" ? "public" : "private",
    questions: Array.isArray(source.questions)
      ? source.questions.map(normalizeQuestion)
      : [],
  };
}

export default function ResultPage() {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const [mock, setMock] = useState<MockDetail | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [flaggedQuestionIds, setFlaggedQuestionIds] = useState<string[]>([]);
  const [hasSavedAnswers, setHasSavedAnswers] = useState(false);
  const [recordedScore, setRecordedScore] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [ranks, setRanks] = useState<RankComparison>(null);

  useEffect(() => {
    if (authLoading) return;
    let active = true;
    setRanks(null);
    const load = async () => {
      try {
        let res = await fetch(appPath(`/api/mocks/${id}`), { cache: "no-store" });
        if (res.status === 401) res = await fetch(appPath(`/api/public/mocks/${id}`), { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Unable to load this review");
        if (!active) return;
        setMock(normalizeMock(data.mock));
        const candidateEmail = getMockCandidateEmail(user?.email);
        const attempt = resolveMockAttempt(data.mock, readCompletedMockAttempt(id, candidateEmail), candidateEmail);
        setRecordedScore(attempt?.marks ?? null);
        setFlaggedQuestionIds(attempt?.flaggedQuestionIds ?? []);
        const parsed = attempt?.answers;
        setAnswers({});
        setHasSavedAnswers(false);
        if (parsed && typeof parsed === "object") {
          setAnswers(Object.fromEntries(Object.entries(parsed).filter(([, value]) => Number.isInteger(value) && Number(value) >= 0).map(([key, value]) => [key, Number(value)])));
          setHasSavedAnswers(true);
        }
        if (candidateEmail) {
          try {
            const rankingsResponse = await fetch(appPath(`/api/mocks/${id}/results`), { cache: "no-store" });
            if (!rankingsResponse.ok) return;
            const rankings = firstAttemptRankings(await rankingsResponse.json());
            const me = rankings.find((row) => row.email === candidateEmail);
            if (active && me) {
              const effective = mockEffectiveRank(attempt?.marks ?? me.marks, rankings.filter((row) => row.email !== candidateEmail), attempt ? attempt.timeTakenSeconds : me.timeTakenSeconds);
              if (effective !== null) setRanks({ official: me.rank, effective });
            }
          } catch { /* Answer review remains available if the leaderboard is unavailable. */ }
        }
      } catch (error) {
        if (active) setError(error instanceof Error ? error.message : "Unable to load this review");
      }
    };

    void load();
    return () => { active = false; };
  }, [authLoading, id, user?.email]);

  const score = useMemo(() => {
    if (!mock) {
      return 0;
    }

    return mock.questions.reduce((total, question) => {
      const selectedIndex = answers[question.id];
      const isValidCorrectAnswer =
        Number.isInteger(question.correctAnswer) &&
        question.correctAnswer >= 0 &&
        question.correctAnswer < question.options.length;

      if (!isValidCorrectAnswer) {
        return total;
      }

      return selectedIndex === question.correctAnswer ? total + 1 : total;
    }, 0);
  }, [answers, mock]);

  if (!mock) {
    return <main className="urologics-shell min-h-screen p-8 text-center text-[var(--text-secondary)]">{error || "Loading answer review..."}</main>;
  }

  return <ReviewAnswers mock={mock} answers={answers} flaggedQuestionIds={flaggedQuestionIds} hasSavedAnswers={hasSavedAnswers} score={recordedScore ?? score} ranks={ranks} />;
}
