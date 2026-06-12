"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import toast from "react-hot-toast";

import VivaVoiceAi from "@/components/ai-viva/VivaVoiceAi";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDefaultExaminer, type ExaminerVoice } from "@/lib/examiner-voices";
import { appPath } from "@/lib/app-path";
import type { VivaCaseRecord } from "@/lib/viva-case";

type VivaMode = "calm" | "fast";

type CandidateInfo = {
  name: string;
  email: string;
};

type StoredCandidateInfo = CandidateInfo & {
  selectedCaseId: string;
  selectedCaseTitle: string;
  selectedCase: VivaCaseRecord;
  selectedMode: VivaMode;
  selectedExaminerId: string;
  selectedExaminer: ExaminerVoice;
  conversation: unknown[];
  report: unknown;
  publicParticipant?: {
    source: string;
    status: string;
    startedAt: string;
  };
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getStoredPublicCandidate(vivaCase: VivaCaseRecord, mode: VivaMode) {
  if (typeof window === "undefined") {
    return {
      candidate: { name: "", email: "" },
      submitted: false,
    };
  }

  try {
    const raw = window.localStorage.getItem("candidateInfo");
    if (!raw) {
      return {
        candidate: { name: "", email: "" },
        submitted: false,
      };
    }

    const parsed = JSON.parse(raw) as Partial<StoredCandidateInfo>;
    return {
      candidate: {
        name: parsed.name || "",
        email: parsed.email || "",
      },
      submitted:
        Boolean(parsed.name && parsed.email) &&
        parsed.selectedCaseId === vivaCase.id &&
        parsed.selectedMode === mode,
    };
  } catch {
    return {
      candidate: { name: "", email: "" },
      submitted: false,
    };
  }
}

export default function PublicVivaSessionClient({ vivaCase }: { vivaCase: VivaCaseRecord }) {
  const searchParams = useSearchParams();
  const selectedModeFromUrl: VivaMode = searchParams.get("mode") === "fast" ? "fast" : "calm";
  const source = searchParams.get("source") || "external-web";
  const initialState = getStoredPublicCandidate(vivaCase, selectedModeFromUrl);
  const [candidate, setCandidate] = useState<CandidateInfo>(initialState.candidate);
  const [submitted, setSubmitted] = useState(initialState.submitted);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const name = candidate.name.trim();
    const email = candidate.email.trim().toLowerCase();

    if (!name || !EMAIL_PATTERN.test(email)) {
      toast.error("Please enter your name and a valid email.");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch(
        appPath(`/api/public/viva-cases/${encodeURIComponent(vivaCase.id)}/start`),
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name,
            email,
            source,
          }),
        }
      );

      if (res.status === 400) {
        throw new Error("Please enter your name and a valid email.");
      }

      if (!res.ok) {
        throw new Error("We could not start the viva right now. Please try again.");
      }

      const data = (await res.json()) as {
        participant?: {
          source?: string;
          status?: string;
          startedAt?: string;
        };
      };
      const selectedExaminer = getDefaultExaminer(selectedModeFromUrl);
      const storedValue: StoredCandidateInfo = {
        name,
        email,
        selectedCaseId: vivaCase.id,
        selectedCaseTitle: vivaCase.case.title,
        selectedCase: vivaCase,
        selectedMode: selectedModeFromUrl,
        selectedExaminerId: selectedExaminer.id,
        selectedExaminer,
        conversation: [],
        report: null,
        publicParticipant: {
          source: data.participant?.source || source,
          status: data.participant?.status || "started",
          startedAt: data.participant?.startedAt || new Date().toISOString(),
        },
      };

      window.localStorage.setItem("candidateInfo", JSON.stringify(storedValue));
      setSubmitted(true);
      toast.success("Starting viva");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "We could not start the viva right now. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <main className="min-h-screen bg-white text-[#071014]">
        <VivaVoiceAi vivaCase={vivaCase} selectedMode={selectedModeFromUrl} />
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-white p-4 text-[#071014]">
      <Card className="w-full max-w-md rounded-[28px] border-[#0f7896]/12 bg-white shadow-[0_16px_40px_rgba(15,120,150,0.09)]">
        <CardHeader>
          <img
            src={appPath("/logo.png")}
            alt="Urologics"
            className="mx-auto mb-3 h-16 w-16 object-contain"
          />
          <div className="mb-4 text-center text-xs font-semibold uppercase tracking-[0.22em] text-[#0f7896]">
            Urologics AI
          </div>
          <CardTitle className="text-center text-[#071014]">{vivaCase.case.title}</CardTitle>
          <p className="text-center text-xs uppercase tracking-[0.22em] text-[#0f7896]">
            {selectedModeFromUrl === "fast" ? "Fast and Furious" : "Calm and Composed"}
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="mb-1 block text-sm font-medium text-[#071014]/65">
                Full Name
              </label>
              <input
                id="name"
                type="text"
                value={candidate.name}
                onChange={(e) => setCandidate({ ...candidate, name: e.target.value })}
                className="urologics-input"
                placeholder="Enter your full name"
                required
              />
            </div>
            <div>
              <label htmlFor="email" className="mb-1 block text-sm font-medium text-[#071014]/65">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={candidate.email}
                onChange={(e) => setCandidate({ ...candidate, email: e.target.value })}
                className="urologics-input"
                placeholder="Enter your email"
                required
              />
            </div>
            <Button
              type="submit"
              disabled={submitting}
              className="w-full rounded-full bg-[#0f7896] text-white hover:bg-[#0b6078]"
            >
              {submitting ? "Starting..." : "Start Viva"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
