"use client";

import { ArrowRight, ArrowUpRight, ClipboardList, LockKeyhole } from "lucide-react";
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

export default function TestsTabSection({ mocks, mocksLoading, isLoggedIn }: Props) {
  const router = useRouter();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 30000); return () => window.clearInterval(timer); }, []);
  const liveMocks = latestLiveTests(mocks, now);

  function openMock(mock: MockItem) {
    const entitled = mock.accessType === "public" || (mock.access?.allowed === true && mock.access?.mode !== "locked");
    if (!entitled) { window.location.assign("https://urologics.co.uk/pricing"); return; }
    if (!isLoggedIn && mock.accessType === "public") { router.push(`/public-mocks/${mock.id}`); return; }
    router.push(`/mocks/${mock.id}/rules`);
  }

  return (
    <section className="overview-card overview-tests overview-mocks" aria-labelledby="available-tests-heading">
      <div className="overview-card-heading">
        <span className="overview-section-icon"><ClipboardList size={20} aria-hidden="true" /></span>
        <h2 id="available-tests-heading">Mocks</h2>
        <div className="overview-test-controls">
          <Link href="/mocks" className="overview-text-link">View all <ArrowUpRight size={16} aria-hidden="true" /></Link>
        </div>
      </div>
      {mocksLoading ? <div className="overview-tests-loading" aria-label="Loading mocks" aria-busy="true">{[1, 2, 3].map((key) => <div key={key} className="overview-skeleton" />)}</div>
      : !liveMocks.length ? <div className="overview-empty-inline"><p>No mocks are live right now. View all mocks for upcoming sessions.</p></div>
      : <div className="overview-test-list">
        {liveMocks.map((mock) => {
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
