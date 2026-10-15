"use client";

import { ArrowRight, ArrowUpRight, BrainCircuit, ClipboardList, LockKeyhole } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import { latestLiveTests, type OverviewTest } from "@/lib/overview-tests";

export type MockItem = OverviewTest & {
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
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 30000); return () => window.clearInterval(timer); }, []);
  const filtered = latestLiveTests(mocks, now, filter);
  const loading = vivaMode ? vivaLoading : mocksLoading;
  const items = vivaMode ? vivaCases : filtered;

  function openMock(mock: MockItem) {
    const entitled = mock.accessType === "public" || (mock.access?.allowed === true && mock.access?.mode !== "locked");
    if (!entitled) { window.location.assign("https://urologics.co.uk/pricing"); return; }
    if (!isLoggedIn && mock.accessType === "public") { router.push(`/public-mocks/${mock.id}`); return; }
    router.push(`/mocks/${mock.id}/rules`);
  }

  return (
    <section className="overview-card overview-tests overview-mocks" aria-labelledby="available-tests-heading">
      <div className="overview-card-heading">
        <span className="overview-section-icon">{vivaMode ? <BrainCircuit size={20} aria-hidden="true" /> : <ClipboardList size={20} aria-hidden="true" />}</span>
        <h2 id="available-tests-heading">{vivaMode ? "AI viva cases" : "Mocks"}</h2>
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
      : !items.length ? <div className="overview-empty-inline"><p>{vivaMode ? isLoggedIn ? "New viva cases will appear here when available." : "Sign in to access your AI viva cases." : filter === "attended" ? "Your completed mocks will appear here to practise again." : "No mocks are live right now. View all mocks for upcoming sessions."}</p></div>
      : <div className="overview-test-list">
        {vivaMode ? vivaCases.slice(0, 3).map((viva) => <article key={viva.id} className="overview-test-row">
          <div className="overview-test-name"><span className="overview-test-icon"><BrainCircuit size={17} aria-hidden="true" /></span><h3>{viva.title}</h3></div>
          <Link href={`/ai-viva/session/${viva.id}`} className="overview-test-start">Start case <ArrowRight size={15} aria-hidden="true" /></Link>
        </article>) : filtered.slice(0, 3).map((mock) => {
          const entitled = mock.accessType === "public" || (mock.access?.allowed === true && mock.access?.mode !== "locked");
          return <article key={mock.id} className="overview-test-row">
            <div className="overview-test-name"><span className="overview-test-icon"><ClipboardList size={17} aria-hidden="true" /></span><h3>{mock.title}</h3></div>
            <div className="overview-test-actions">
              <button type="button" className="overview-test-start" onClick={() => openMock(mock)}>Start Mock{!entitled ? <LockKeyhole size={14} aria-hidden="true" /> : <ArrowRight size={14} aria-hidden="true" />}</button>
            </div>
          </article>;
        })}
      </div>}
    </section>
  );
}
