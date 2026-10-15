"use client";

import { ArrowRight, ArrowUpRight, BrainCircuit, ClipboardList, Clock3, LockKeyhole, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";

export type MockItem = {
  id: string;
  title: string;
  description?: string;
  durationMinutes: number;
  questionCount?: number;
  totalQuestions?: number;
  accessType?: string;
  hasAttempted?: boolean;
  userAttempt?: { score?: number; marks?: number };
  access?: { allowed?: boolean; mode?: string; reason?: string | null };
};

export type VivaCase = {
  id: string;
  title: string;
  specialty?: string;
  difficulty?: string;
};

interface Props {
  mocks: MockItem[];
  vivaCases: VivaCase[];
  mocksLoading: boolean;
  vivaLoading: boolean;
  isLoggedIn: boolean;
}

export default function TestsTabSection({ mocks, vivaCases, mocksLoading, vivaLoading, isLoggedIn }: Props) {
  const [filter, setFilter] = useState("all");
  const router = useRouter();
  const vivaMode = filter === "viva";
  const filtered = mocks.filter((mock) => filter === "public" ? mock.accessType === "public" : filter === "attended" ? mock.hasAttempted : true);
  const loading = vivaMode ? vivaLoading : mocksLoading;
  const items = vivaMode ? vivaCases : filtered;

  function openMock(mock: MockItem, reattempt = false) {
    const entitled = mock.accessType === "public" || (mock.access?.allowed === true && mock.access?.mode !== "locked");
    if (!entitled) { window.location.assign("https://urologics.co.uk/pricing"); return; }
    if (!isLoggedIn && mock.accessType === "public") { router.push(`/public-mocks/${mock.id}`); return; }
    router.push(`/mocks/${mock.id}/${mock.hasAttempted && !reattempt ? "result" : "rules"}`);
  }

  return (
    <section className="overview-card overview-tests" aria-labelledby="available-tests-heading">
      <div className="overview-card-heading">
        <span className="overview-section-icon">{vivaMode ? <BrainCircuit size={20} aria-hidden="true" /> : <ClipboardList size={20} aria-hidden="true" />}</span>
        <h2 id="available-tests-heading">{vivaMode ? "AI viva cases" : "Available mock tests"}</h2>
        <div className="overview-test-controls">
          <select aria-label="Filter available tests" value={filter} onChange={(event) => setFilter(event.target.value)}>
            <option value="all">All mocks</option>
            <option value="public">Public mocks</option>
            <option value="attended">Attended</option>
            <option value="viva">AI Viva</option>
          </select>
          <Link href={vivaMode ? "/ai-viva/cases" : "/mocks"} className="overview-text-link">View all <ArrowUpRight size={16} aria-hidden="true" /></Link>
        </div>
      </div>
      {loading ? <div className="overview-tests-loading" aria-label="Loading tests" aria-busy="true">{[1, 2, 3].map((key) => <div key={key} className="overview-skeleton" />)}</div>
      : !items.length ? <div className="overview-empty-inline"><p>{vivaMode ? isLoggedIn ? "New viva cases will appear here when available." : "Sign in to access your AI viva cases." : filter === "attended" ? "Your completed mocks will appear here for review." : "New mock tests will appear here when available."}</p></div>
      : <div className="overview-test-list">
        <div className="overview-test-table-heading" aria-hidden="true"><span>{vivaMode ? "Case" : "Test"}</span><span>{vivaMode ? "Specialty" : "Questions"}</span><span>{vivaMode ? "Difficulty" : "Duration"}</span><span /></div>
        {vivaMode ? vivaCases.slice(0, 3).map((viva) => <article key={viva.id} className="overview-test-row">
          <div className="overview-test-name"><span className="overview-test-icon"><BrainCircuit size={17} aria-hidden="true" /></span><div><h3>{viva.title}</h3><p className="overview-test-mobile-meta">{viva.specialty}{viva.difficulty && ` \u00b7 ${viva.difficulty}`}</p></div></div>
          <span className="overview-test-detail">{viva.specialty || "Urology"}</span><span className="overview-test-detail">{viva.difficulty || "All levels"}</span>
          <Link href={`/ai-viva/session/${viva.id}`} className="overview-test-start">Start case <ArrowRight size={15} aria-hidden="true" /></Link>
        </article>) : filtered.slice(0, 3).map((mock) => {
          const entitled = mock.accessType === "public" || (mock.access?.allowed === true && mock.access?.mode !== "locked");
          const count = mock.questionCount ?? mock.totalQuestions;
          return <article key={mock.id} className="overview-test-row">
            <div className="overview-test-name"><span className="overview-test-icon"><ClipboardList size={17} aria-hidden="true" /></span><div><h3>{mock.title}</h3>{mock.description && <p className="overview-test-description">{mock.description}</p>}<p className="overview-test-mobile-meta"><Clock3 size={12} aria-hidden="true" />{mock.durationMinutes} min{mock.hasAttempted && ` \u00b7 Score: ${mock.userAttempt?.score ?? mock.userAttempt?.marks ?? 0}`}</p></div></div>
            <span className="overview-test-detail">{count !== undefined ? `${count} questions` : "Not set"}</span>
            <span className="overview-test-detail">{mock.durationMinutes} min</span>
            <div className="overview-test-actions">
              <button type="button" className="overview-test-start" onClick={() => openMock(mock)}>{!entitled ? "Unlock" : mock.hasAttempted ? "Review Answers" : "Start mock"}{!entitled ? <LockKeyhole size={14} /> : <ArrowRight size={14} />}</button>
              {mock.hasAttempted && entitled && <button type="button" className="overview-test-reattempt" onClick={() => openMock(mock, true)} aria-label={`Reattempt ${mock.title}`}><RotateCcw size={14} aria-hidden="true" /><span>Reattempt</span></button>}
            </div>
          </article>;
        })}
      </div>}
    </section>
  );
}
