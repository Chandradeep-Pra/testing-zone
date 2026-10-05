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
    const resolvedCandidate = initialCandidate || {
      name: parsed.name || "",
      email: parsed.email || "",
    };
    return {
      candidate: resolvedCandidate,
      submitted:
        Boolean(resolvedCandidate.name && resolvedCandidate.email) &&
        (Boolean(initialCandidate) || parsed.selectedCaseId === vivaCase.id),
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
  const aiMode = searchParams.get("ai") === "1";
  const [initialState] = useState(() => getStoredCandidate(vivaCase, selectedModeFromUrl, initialCandidate));

  useEffect(() => {
    if (!autoStart || !initialCandidate?.name) return;

    saveCandidateSession(vivaCase, selectedModeFromUrl, initialCandidate);
  }, [autoStart, initialCandidate, selectedModeFromUrl, vivaCase]);

  return (
    <main className="min-h-screen bg-white text-[#071014]">
      <VivaVoiceAi
        vivaCase={vivaCase}
        selectedMode={selectedModeFromUrl}
        initialCandidate={initialState.candidate}
        aiMode={aiMode}
      />
    </main>
  );
}