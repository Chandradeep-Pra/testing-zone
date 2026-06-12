"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import toast from "react-hot-toast";

import VivaVoiceAi from "@/components/ai-viva/VivaVoiceAi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getDefaultExaminer, type ExaminerVoice } from "@/lib/examiner-voices";
import { appPath } from "@/lib/app-path";
import type { VivaCaseRecord } from "@/lib/viva-case";

type CandidateInfo = {
  name: string;
  email: string;
};

type VivaMode = "calm" | "fast";

type StoredCandidateInfo = CandidateInfo & {
  selectedCaseId?: string;
  selectedCaseTitle?: string;
  selectedCase?: VivaCaseRecord;
  selectedMode?: VivaMode;
  selectedExaminerId?: string;
  selectedExaminer?: ExaminerVoice;
  conversation?: unknown[];
  report?: unknown;
};

function getStoredCandidate(vivaCase: VivaCaseRecord, mode: VivaMode, initialCandidate?: CandidateInfo): {
  candidate: CandidateInfo;
  submitted: boolean;
  selectedMode: VivaMode;
  selectedExaminerId?: string;
} {
  const defaultCandidate = initialCandidate || { name: "", email: "" };

  if (typeof window === "undefined") {
    return {
      candidate: defaultCandidate,
      submitted: Boolean(defaultCandidate.name && defaultCandidate.email),
      selectedMode: mode,
      selectedExaminerId: getDefaultExaminer(mode).id,
    };
  }

  try {
    const raw = window.localStorage.getItem("candidateInfo");
    if (!raw) {
      return {
        candidate: defaultCandidate,
        submitted: Boolean(defaultCandidate.name && defaultCandidate.email),
        selectedMode: mode,
        selectedExaminerId: getDefaultExaminer(mode).id,
      };
    }

    const parsed = JSON.parse(raw) as StoredCandidateInfo;
    return {
      candidate: {
        name: parsed.name || "",
        email: parsed.email || "",
      },
      submitted:
        Boolean(parsed.name && parsed.email) && parsed.selectedCaseId === vivaCase.id,
      selectedMode: parsed.selectedMode || "calm",
      selectedExaminerId: parsed.selectedExaminerId || getDefaultExaminer(parsed.selectedMode || "calm").id,
    };
  } catch {
    return {
      candidate: defaultCandidate,
      submitted: Boolean(defaultCandidate.name && defaultCandidate.email),
      selectedMode: mode,
      selectedExaminerId: getDefaultExaminer(mode).id,
    };
  }
}

function saveCandidateSession(
  vivaCase: VivaCaseRecord,
  selectedMode: VivaMode,
  candidate: CandidateInfo
) {
  const selectedExaminer = getDefaultExaminer(selectedMode);
  const storedValue: StoredCandidateInfo = {
    name: candidate.name.trim(),
    email: candidate.email.trim().toLowerCase(),
    selectedCaseId: vivaCase.id,
    selectedCaseTitle: vivaCase.case.title,
    selectedCase: vivaCase,
    selectedMode,
    selectedExaminerId: selectedExaminer.id,
    selectedExaminer,
    conversation: [],
    report: null,
  };

  window.localStorage.setItem("candidateInfo", JSON.stringify(storedValue));
}

export default function VivaSessionClient({
  vivaCase,
  initialCandidate,
  autoStart = false,
}: {
  vivaCase: VivaCaseRecord;
  initialCandidate?: CandidateInfo;
  autoStart?: boolean;
}) {
  const searchParams = useSearchParams();
  const selectedModeFromUrl: VivaMode = searchParams.get("mode") === "fast" ? "fast" : "calm";
  const initialState = getStoredCandidate(vivaCase, selectedModeFromUrl, initialCandidate);
  const [candidate, setCandidate] = useState<CandidateInfo>(initialState.candidate);
  const [submitted, setSubmitted] = useState(
    (autoStart || initialState.submitted) && initialState.selectedMode === selectedModeFromUrl
  );

  useEffect(() => {
    if (!autoStart || !initialCandidate?.name || !initialCandidate.email) return;

    saveCandidateSession(vivaCase, selectedModeFromUrl, initialCandidate);
  }, [autoStart, initialCandidate, selectedModeFromUrl, vivaCase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const name = candidate.name.trim();
    const email = candidate.email.trim().toLowerCase();

    if (!name || !email) {
      toast.error("Please fill all fields");
      return;
    }

    saveCandidateSession(vivaCase, selectedModeFromUrl, { name, email });
    setSubmitted(true);
    toast.success("Starting viva");
  };

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
          <CardTitle className="text-center text-[#071014]">Candidate Information</CardTitle>
          <p className="text-center text-sm text-[#071014]/65">{vivaCase.case.title}</p>
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
            <Button type="submit" className="w-full rounded-full bg-[#0f7896] text-white hover:bg-[#0b6078]">
              Start Viva
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
