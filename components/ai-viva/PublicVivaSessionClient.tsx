"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";

import VivaVoiceAi from "@/components/ai-viva/VivaVoiceAi";
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
        Boolean(parsed.name) &&
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
  const candidate = initialState.candidate;
  const [participantStarted, setParticipantStarted] = useState(initialState.submitted);

  async function handleCandidateReady(candidateInfo: CandidateInfo) {
    if (participantStarted) return;

    const name = candidateInfo.name.trim();
    const email = candidateInfo.email.trim().toLowerCase();
    const res = await fetch(
      appPath(`/api/public/viva-cases/${encodeURIComponent(vivaCase.id)}/start`),
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, source }),
      },
    );

    if (res.status === 400) {
      throw new Error("Please enter your name and a valid email.");
    }
    if (!res.ok) {
      throw new Error("We could not start the viva right now. Please try again.");
    }

    const data = (await res.json()) as {
      participant?: { source?: string; status?: string; startedAt?: string };
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
    setParticipantStarted(true);
  }

  return (
    <main className="min-h-screen bg-white text-[#071014]">
      <VivaVoiceAi
        vivaCase={vivaCase}
        selectedMode={selectedModeFromUrl}
        initialCandidate={candidate}
        onCandidateReady={handleCandidateReady}
      />
    </main>
  );
}
