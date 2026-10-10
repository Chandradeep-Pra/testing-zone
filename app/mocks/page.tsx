"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Clock3,
  CircleDot,
  Filter,
  LockKeyhole,
  Search,
  ShieldCheck,
  Stethoscope,
  TimerReset,
  Trophy,
} from "lucide-react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

import { useAuth } from "@/components/auth/AuthProvider";
import UrologicsBrand from "@/components/brand/UrologicsBrand";
import UrologicsHeader from "@/components/brand/UrologicsHeader";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import GlobalLoading from "@/components/ui/GlobalLoading";
import { appPath } from "@/lib/app-path";

// ============================================================================
// TEMPORARY SAMPLE DATA TOGGLE
// Change this single line to `false` (or comment it out) to disable sample mock data:
const ENABLE_SAMPLE_MOCKS = false;
// ============================================================================
import { SAMPLE_MOCKS, type Mock, type TimestampLike } from "@/data/sample-mocks";

const PRICING_URL = "https://urologics.co.uk/pricing";

const getTimestamp = (value?: string | number | TimestampLike): number => {
  if (typeof value === "object" && value?._seconds) {
    return value._seconds * 1000;
  }

  return typeof value === "string" || typeof value === "number"
    ? new Date(value).getTime()
    : 0;
};

const isUserEntitledToMock = (mock: Mock): boolean => {
  if (mock.accessType === "public") return true;
  if (mock.access) return Boolean(mock.access.allowed);
  return true;
};

const getMockKindLabel = (mock: Mock): string =>
  mock.type === "grand-mock" ? "Grand Mock" : "Mock";

// Elegant medical illustration in greenish light-greyish tones
function MedicalNoMocksIllustration() {
  return (
    <div className="relative mx-auto flex h-44 w-44 items-center justify-center sm:h-52 sm:w-52">
      {/* Soft greenish light-greyish ambient aura */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-[var(--accent-soft)] via-[var(--surface-tint)] to-[var(--surface-muted)] opacity-85 blur-2xl dark:opacity-40" />

      <svg
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="relative h-full w-full drop-shadow-[0_14px_30px_var(--shadow-soft)]"
      >
        {/* Subtle decorative concentric rings */}
        <circle
          cx="100"
          cy="100"
          r="86"
          stroke="var(--border)"
          strokeWidth="1.5"
          strokeDasharray="4 4"
          className="opacity-70"
        />
        <circle
          cx="100"
          cy="100"
          r="72"
          fill="var(--surface-tint)"
          stroke="color-mix(in srgb, var(--accent) 26%, var(--border))"
          strokeWidth="1.5"
        />

        {/* Floating medical plus crosses in accent tones */}
        <g className="text-[var(--accent-strong)] opacity-60">
          <path d="M42 56H50M46 52V60" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M152 46H160M156 42V50" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M154 148H162M158 144V152" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="48" cy="142" r="3" fill="currentColor" opacity="0.35" />
        </g>

        {/* Medical Examination Clipboard */}
        <g>
          {/* Clipboard board */}
          <rect
            x="66"
            y="52"
            width="68"
            height="96"
            rx="14"
            fill="var(--surface-raised)"
            stroke="var(--border)"
            strokeWidth="2"
          />

          {/* Top Clip */}
          <rect
            x="83"
            y="44"
            width="34"
            height="16"
            rx="6"
            fill="var(--accent-soft)"
            stroke="var(--accent)"
            strokeWidth="1.8"
          />
          <circle cx="100" cy="50" r="2.5" fill="var(--accent)" />

          {/* Medical Cross on top of document */}
          <rect x="94" y="68" width="12" height="12" rx="3" fill="var(--accent-soft)" />
          <path d="M100 71V77M97 74H103" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" />

          {/* Checklist / question rows */}
          <rect x="80" y="88" width="40" height="3" rx="1.5" fill="var(--border-strong)" opacity="0.8" />
          <rect x="80" y="96" width="32" height="3" rx="1.5" fill="var(--border-strong)" opacity="0.55" />

          {/* Clinical EKG / Heart Pulse rhythm line */}
          <path
            d="M78 116H87L91 108L96 122L101 112L104 118L107 116H122"
            stroke="var(--accent)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>

        {/* Clinical Stethoscope looping around */}
        <g stroke="var(--accent-strong)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          {/* Tubing loop */}
          <path d="M60 88C52 108 54 136 78 148C94 156 114 154 126 142" />
          {/* Binaural earpiece */}
          <path d="M56 82C56 74 62 68 70 68" />
          <circle cx="70" cy="68" r="3" fill="var(--accent-strong)" />
          {/* Stethoscope Chestpiece / Diaphragm */}
          <circle cx="132" cy="138" r="8" fill="var(--surface-raised)" stroke="var(--accent)" strokeWidth="2.5" />
          <circle cx="132" cy="138" r="3.5" fill="var(--accent)" />
        </g>
      </svg>
    </div>
  );
}

export default function TodayMocksPage() {
  const { user, loading: authLoading } = useAuth();
  const [mocks, setMocks] = useState<Mock[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedMock, setSelectedMock] = useState<Mock | null>(null);
  const [checkingMockId, setCheckingMockId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (authLoading) return;

    const load = async () => {
      try {
        setLoading(true);
        const res = await fetch(appPath("/api/mocks"), { cache: "no-store" });
        if (!res.ok) {
          throw new Error("Failed to fetch mocks");
        }
        const data = (await res.json()) as { mocks?: Mock[] };
        const fetched = data.mocks || [];

        // If remote API returns mocks, show them; otherwise load sample mocks if enabled
        if (fetched.length > 0) {
          setMocks(fetched);
        } else if (ENABLE_SAMPLE_MOCKS) {
          setMocks(SAMPLE_MOCKS);
        } else {
          setMocks([]);
        }
      } catch (err) {
        console.warn("Could not fetch remote mocks:", err);
        // Fall back gracefully to preview data if enabled, otherwise empty array
        setMocks(ENABLE_SAMPLE_MOCKS ? SAMPLE_MOCKS : []);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [authLoading, user]);

  const liveMocks = useMemo(() => {
    const now = Date.now();
    return mocks.filter((mock) => {
      const start = getTimestamp(mock.startTime);
      const end = getTimestamp(mock.endTime) || (start ? start + mock.durationMinutes * 60 * 1000 : 0);
      return Boolean(start && end && now >= start && now <= end);
    });
  }, [mocks]);

  const attendedMocks = useMemo(() => {
    return mocks.filter((mock) => Boolean(mock.hasAttempted));
  }, [mocks]);

  const filteredMocks = useMemo(() => {
    const searchLower = search.toLowerCase().trim();
    const now = Date.now();

    return mocks.filter((mock) => {
      const matchesSearch =
        !searchLower ||
        mock.title.toLowerCase().includes(searchLower) ||
        getMockKindLabel(mock).toLowerCase().includes(searchLower) ||
        String(mock.quizId || "").toLowerCase().includes(searchLower);

      const matchesType =
        typeFilter === "all" ||
        (typeFilter === "grand-mock" && mock.type === "grand-mock") ||
        (typeFilter === "mock" && mock.type !== "grand-mock") ||
        (typeFilter === "public" && mock.accessType === "public") ||
        (typeFilter === "members" && mock.accessType !== "public");

      let matchesCategory = true;
      if (selectedCategory === "live") {
        const start = getTimestamp(mock.startTime);
        const end = getTimestamp(mock.endTime) || (start ? start + mock.durationMinutes * 60 * 1000 : 0);
        matchesCategory = Boolean(start && end && now >= start && now <= end);
      } else if (selectedCategory === "grand-mock") {
        matchesCategory = mock.type === "grand-mock";
      } else if (selectedCategory === "mock") {
        matchesCategory = mock.type !== "grand-mock";
      } else if (selectedCategory === "public") {
        matchesCategory = mock.accessType === "public";
      } else if (selectedCategory === "attended") {
        matchesCategory = Boolean(mock.hasAttempted);
      }

      return matchesSearch && matchesType && matchesCategory;
    });
  }, [mocks, search, typeFilter, selectedCategory]);

  const selectedCategoryLabel = useMemo(() => {
    switch (selectedCategory) {
      case "live":
        return "Live Mock Sessions";
      case "grand-mock":
        return "Grand Mocks";
      case "mock":
        return "Standard Mocks";
      case "public":
        return "Public Mock Sessions";
      case "attended":
        return "Attended Mock Sessions";
      default:
        return "All Mock Sessions";
    }
  }, [selectedCategory]);

  const progressPercent = useMemo(() => {
    if (mocks.length === 0) return 0;
    if (attendedMocks.length > 0) {
      return Math.min(100, Math.round((attendedMocks.length / mocks.length) * 100));
    }
    return 100;
  }, [attendedMocks.length, mocks.length]);

  const openMock = (mock: Mock) => {
    if (!isUserEntitledToMock(mock)) {
      window.open(PRICING_URL, "_blank", "noopener,noreferrer");
      return;
    }

    if (!user && mock.accessType === "public") {
      router.push(`/public-mocks/${mock.id}`);
      return;
    }

    setSelectedMock(mock);
  };

  const handleContinue = async () => {
    if (!selectedMock) return;

    if (!user && selectedMock.accessType === "public") {
      router.push(`/public-mocks/${selectedMock.id}`);
      return;
    }

    if (!user) {
      toast.error("Please login to attend this mock.");
      window.location.assign("https://urologics.co.uk/login");
      return;
    }

    setCheckingMockId(selectedMock.id);
    try {
      const res = await fetch(appPath(`/api/mocks/${selectedMock.id}`), { cache: "no-store" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setMocks((current) => current.filter((m) => m.id !== selectedMock.id));
        setSelectedMock(null);
        toast.error(data?.error || "You no longer have access to this mock.");
        return;
      }

      router.push(`/mocks/${selectedMock.id}/rules`);
    } finally {
      setCheckingMockId(null);
    }
  };

  if (loading) {
    return (
      <main className="urologics-shell flex min-h-screen items-center justify-center">
        <div className="urologics-panel px-8 py-8">
          <GlobalLoading />
        </div>
      </main>
    );
  }

  return (
    <main className="urologics-shell overflow-hidden">
      <div className="mobile-native-page mx-auto max-w-7xl px-2 pb-8 sm:px-3 sm:py-4">
        <UrologicsHeader current="Mocks" product="Grand Mocks" tag="Exam session library" />

        {/* Filter and Search Bar (matching AI Viva design system) */}
        <section className="mb-4 rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-3 sm:mb-5 sm:p-4">
          <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => setSelectedCategory("all")}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                selectedCategory === "all"
                  ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-text)]"
                  : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] hover:bg-[var(--accent-soft)]"
              }`}
            >
              All sessions
            </button>
            <button
              type="button"
              onClick={() => setSelectedCategory("live")}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                selectedCategory === "live"
                  ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-text)]"
                  : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] hover:bg-[var(--accent-soft)]"
              }`}
            >
              <span className="inline-flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
                </span>
                Live now {liveMocks.length > 0 ? `(${liveMocks.length})` : ""}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedCategory("grand-mock")}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                selectedCategory === "grand-mock"
                  ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-text)]"
                  : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] hover:bg-[var(--accent-soft)]"
              }`}
            >
              Grand Mocks
            </button>
           
            <button
              type="button"
              onClick={() => setSelectedCategory("public")}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                selectedCategory === "public"
                  ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-text)]"
                  : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] hover:bg-[var(--accent-soft)]"
              }`}
            >
              Public Mocks
            </button>
            {attendedMocks.length > 0 ? (
              <button
                type="button"
                onClick={() => setSelectedCategory("attended")}
                className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                  selectedCategory === "attended"
                    ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-text)]"
                    : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] hover:bg-[var(--accent-soft)]"
                }`}
              >
                Attended ({attendedMocks.length})
              </button>
            ) : null}
          </div>

          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_190px]">
            <label className="relative block">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search mocks by title, topic, or duration"
                aria-label="Search mock sessions"
                className="urologics-input !py-2.5 !pl-9"
              />
            </label>
            <div className="relative">
              <Filter size={15} className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-[var(--text-tertiary)]" />
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger
                  aria-label="Filter by type"
                  className="urologics-input !h-auto !rounded-2xl !border-[var(--border)] !bg-[var(--surface)] !px-4 !py-2.5 !pl-9 !pr-10 !text-base shadow-none focus-visible:!border-[var(--accent)] focus-visible:!bg-[var(--surface-raised)] focus-visible:!ring-4 focus-visible:!ring-[var(--focus)]"
                >
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="grand-mock">Grand Mocks</SelectItem>
                  <SelectItem value="public">Public Mocks</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </section>

        {/* Progress / Status banner (matching AI Viva credit/minutes banner) */}
        {/* {mocks.length > 0 ? (
          <section className="urologics-panel mb-4 overflow-hidden p-4">
            <div className="flex flex-wrap items-center justify-between gap-5">
              <div className="flex items-center gap-4">
                <div className="grid h-12 w-12 place-items-center rounded-2xl border border-[var(--border)] bg-[var(--accent-soft)] text-[var(--accent-strong)]">
                  <Trophy size={20} />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-secondary)]">
                    Mock Exam Practice
                  </p>
                  <h2 className="mt-1 text-xl font-semibold text-[var(--text-primary)]">
                    {attendedMocks.length > 0
                      ? `${attendedMocks.length} of ${mocks.length} sessions completed`
                      : `${mocks.length} timed mock sessions available`}
                  </h2>
                </div>
              </div>
              <div className="rounded-full bg-[var(--accent-soft)] px-4 py-2 text-sm font-semibold text-[var(--accent-strong)]">
                {liveMocks.length > 0 ? `${liveMocks.length} Live Now` : "Timed Exam Conditions"}
              </div>
            </div>
            <div className="mt-5 h-3 overflow-hidden rounded-full bg-[var(--accent-soft)]">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${progressPercent}%`,
                  backgroundColor: "var(--accent)",
                }}
              />
            </div>
          </section>
        ) : null} */}

        {/* Mock sessions section */}
        <section className="pb-12">
          {filteredMocks.length === 0 ? (
            /* Clean greenish light-greyish medical empty state */
            <div className="rounded-[28px] border border-[var(--border)] bg-gradient-to-b from-[var(--surface-raised)] via-[var(--surface-tint)] to-[var(--surface)] p-8 text-center shadow-[0_16px_40px_var(--shadow-soft)] sm:p-12">
              <MedicalNoMocksIllustration />

              <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--accent-soft)] px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--accent-strong)]">
                <Stethoscope size={13} />
                Clinical Portal
              </div>

              <h3 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-[var(--text-primary)] sm:text-3xl">
                No Mocks Available
              </h3>

              <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-[var(--text-secondary)] sm:text-base sm:leading-8">
                There are currently no mock sessions matching your active criteria. New clinical case sets and scheduled grand mocks will appear here soon.
              </p>

              {(search || typeFilter !== "all" || selectedCategory !== "all") && (
                <div className="mt-7 flex justify-center">
                  <button
                    type="button"
                    onClick={() => {
                      setSearch("");
                      setTypeFilter("all");
                      setSelectedCategory("all");
                    }}
                    className="urologics-button-secondary gap-2 !px-6 !py-2.5 text-xs font-semibold uppercase tracking-wider"
                  >
                    Reset All Filters
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="min-w-0">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">
                    {selectedCategoryLabel}
                  </p>
                  <h2 className="mt-1 text-2xl font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
                    {filteredMocks.length} mock {filteredMocks.length === 1 ? "session" : "sessions"}
                  </h2>
                </div>
              </div>

              <div className="grid min-w-0 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
                {filteredMocks.map((mock) => {
                  const isEntitled = isUserEntitledToMock(mock);
                  const start = getTimestamp(mock.startTime);
                  const end = getTimestamp(mock.endTime) || (start ? start + mock.durationMinutes * 60 * 1000 : 0);
                  const now = Date.now();
                  const isLive = Boolean(start && end && now >= start && now <= end);

                  return (
                    <article
                      key={mock.id}
                      className={`flex w-full min-w-0 max-w-full flex-col justify-between overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-3 shadow-[0_8px_22px_var(--shadow-soft)] transition sm:p-4 ${
                        isEntitled
                          ? "cursor-pointer hover:-translate-y-1 hover:border-[var(--accent)]"
                          : "cursor-pointer opacity-75 hover:-translate-y-1 hover:border-amber-300"
                      }`}
                      onClick={() => openMock(mock)}
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          openMock(mock);
                        }
                      }}
                    >
                      <div className="min-w-0">
                        {/* Header Badges */}
                        {/* <div className="flex min-w-0 items-center justify-between gap-3">
                          <span className="inline-flex min-w-0 max-w-[62%] items-center truncate rounded-full border border-[var(--border)] bg-[var(--accent-soft)] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--accent-strong)] sm:max-w-none sm:tracking-[0.22em]">
                            {isLive ? (
                              <>
                                <span className="relative mr-1.5 flex h-2 w-2 shrink-0">
                                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
                                </span>
                                Live Now
                              </>
                            ) : (
                              <>
                                <CircleDot size={10} className="mr-1.5 shrink-0" />
                                {getMockKindLabel(mock)}
                              </>
                            )}
                          </span>  
                        </div> */}

                        {/* Title */}
                        <h2 className="mt-3 line-clamp-2 break-words text-lg font-semibold text-[var(--text-primary)] sm:text-xl">
                          {mock.title || "Grand Mock"}
                        </h2>

                        {/* Timing Stem */}
                        <p className="mt-3 line-clamp-1 min-w-0 break-words text-sm font-semibold leading-6 text-[var(--text-secondary)]">
                          {isLive && end
                            ? `Live session · Window closes ${new Date(end).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                            : `${mock.durationMinutes} min timed mock exam simulation`}
                        </p>

                        {/* Duration and Format strip (matching AI Viva mode selector container) */}
                        <div
                          className="mt-3 min-w-0 rounded-lg border border-[var(--border)] bg-[var(--accent-soft)] p-1.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="grid min-w-0 grid-cols-2 gap-2 text-center">
                            <div className="flex min-w-0 items-center justify-center gap-1.5 rounded-[18px] bg-[var(--accent)] px-3 py-2 text-xs font-semibold text-[var(--accent-text)] shadow-[0_12px_28px_var(--shadow-brand)]">
                              <Clock3 size={14} className="shrink-0" />
                              <span className="truncate">{mock.durationMinutes} Minutes</span>
                            </div>
                            <div className="flex min-w-0 items-center justify-center gap-1.5 rounded-[18px] bg-[var(--surface-raised)] px-3 py-2 text-xs font-semibold text-[var(--accent-strong)]">
                              <TimerReset size={14} className="shrink-0" />
                              <span className="truncate">10m Break</span>
                            </div>
                          </div>
                        </div>

                        {/* Previous attempt pill */}
                        {mock.hasAttempted ? (
                          <div className="mt-3 flex items-center justify-between rounded-lg border border-emerald-500/20 bg-emerald-50/70 px-3 py-2 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                            <span className="flex items-center gap-1.5">
                              <Trophy size={14} className="text-emerald-600 dark:text-emerald-400" />
                              Previous Attempt
                            </span>
                            <span className="font-bold">
                              Score: {mock.userAttempt?.score ?? mock.userAttempt?.marks ?? 0}
                            </span>
                          </div>
                        ) : null}

                       
                      </div>

                      {/* Primary CTA button */}
                      <button
                        className={`mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition ${
                          isEntitled
                            ? "bg-[var(--accent)] text-[var(--accent-text)] hover:bg-[var(--accent-hover)]"
                            : "border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          openMock(mock);
                        }}
                      >
                        {isEntitled
                          ? mock.hasAttempted
                            ? "Reattempt Session"
                            : "Start Mock Session"
                          : mock.access?.reason || "Locked (Members Only)"}
                        {isEntitled ? <ArrowRight size={16} /> : <LockKeyhole size={16} />}
                      </button>
                    </article>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Candidate Registration / Confirmation Modal */}
      {selectedMock && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-3 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="w-full max-w-lg rounded-t-[28px] border border-[var(--border)] bg-[var(--surface-raised)] p-6 shadow-[0_24px_60px_var(--shadow-medium)] sm:rounded-[28px] sm:p-8">
            <div className="flex items-center justify-between">
              <UrologicsBrand compact product={getMockKindLabel(selectedMock)} tag="Candidate session check" />
              <button
                type="button"
                onClick={() => setSelectedMock(null)}
                className="grid h-8 w-8 place-items-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] transition hover:bg-[var(--accent-soft)] hover:text-[var(--text-primary)]"
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            <div className="mt-5 text-2xl font-semibold text-[var(--text-primary)]">
              {selectedMock.title || "Grand Mock"}
            </div>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              {selectedMock.durationMinutes} minutes timed session with full question review and ranking.
            </p>

            {selectedMock.hasAttempted ? (
              <div className="mt-6 rounded-[24px] border border-emerald-500/20 bg-emerald-50/70 p-5 text-center dark:bg-emerald-950/40">
                <Trophy className="mx-auto h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                <p className="mt-3 font-semibold text-emerald-900 dark:text-emerald-200">
                  Previous attempt recorded
                </p>
                <p className="mt-1 text-sm text-emerald-700 dark:text-emerald-300">
                  Your marks: {selectedMock.userAttempt?.score ?? selectedMock.userAttempt?.marks ?? 0}
                </p>
                <p className="mt-2 text-xs text-emerald-700/80 dark:text-emerald-300/80">
                  You can start a fresh reattempt session below.
                </p>
              </div>
            ) : (
              <div className="mt-6 rounded-[24px] border border-[var(--border)] bg-[var(--accent-soft)] p-4">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--surface-raised)] text-[var(--accent-strong)]">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-[var(--text-primary)]">
                      {user?.name || "Public candidate"}
                    </p>
                    <p className="truncate text-xs text-[var(--text-secondary)]">
                      {user?.email || "Open access mock session"}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => setSelectedMock(null)}
                className="urologics-button-secondary flex-1"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleContinue}
                disabled={checkingMockId === selectedMock.id}
                className="urologics-button-primary flex-1 disabled:opacity-60"
              >
                {checkingMockId === selectedMock.id
                  ? "Checking access..."
                  : selectedMock.hasAttempted
                    ? "Start Reattempt"
                    : "Enter Session Rules"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
