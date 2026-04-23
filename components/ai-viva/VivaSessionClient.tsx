"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import toast from "react-hot-toast";

import VivaVoiceAi from "@/components/ai-viva/VivaVoiceAi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getDefaultExaminer, type ExaminerVoice } from "@/lib/examiner-voices";
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

function getStoredCandidate(vivaCase: VivaCaseRecord): {
  candidate: CandidateInfo;
  submitted: boolean;
  selectedMode: VivaMode;
  selectedExaminerId?: string;
} {
  if (typeof window === "undefined") {
    return {
      candidate: { name: "", email: "" },
      submitted: false,
      selectedMode: "calm",
      selectedExaminerId: getDefaultExaminer("calm").id,
    };
  }

  try {
    const raw = window.localStorage.getItem("candidateInfo");
    if (!raw) {
      return {
        candidate: { name: "", email: "" },
        submitted: false,
        selectedMode: "calm",
        selectedExaminerId: getDefaultExaminer("calm").id,
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
      candidate: { name: "", email: "" },
      submitted: false,
      selectedMode: "calm",
      selectedExaminerId: getDefaultExaminer("calm").id,
    };
  }
}

export default function VivaSessionClient({ vivaCase }: { vivaCase: VivaCaseRecord }) {
  const searchParams = useSearchParams();
  const selectedModeFromUrl: VivaMode = searchParams.get("mode") === "fast" ? "fast" : "calm";
  const initialState = getStoredCandidate(vivaCase);
  const [candidate, setCandidate] = useState<CandidateInfo>(initialState.candidate);
  const [submitted, setSubmitted] = useState(
    initialState.submitted && initialState.selectedMode === selectedModeFromUrl
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const name = candidate.name.trim();
    const email = candidate.email.trim().toLowerCase();

    if (!name || !email) {
      toast.error("Please fill all fields");
      return;
    }

    const checkAccess = new Promise<boolean>((resolve) => {
      setTimeout(() => {
        const isAllowed =
          !Array.isArray(vivaCase.allowedUser) ||
          vivaCase.allowedUser.length === 0 ||
          vivaCase.allowedUser.includes(email);

        resolve(isAllowed);
      }, 3000);
    });

    toast.promise(checkAccess, {
      loading: "Checking access...",
      success: (isAllowed) => {
        if (!isAllowed) {
          throw new Error("Not allowed");
        }

        const storedValue: StoredCandidateInfo = {
          name,
          email,
          selectedCaseId: vivaCase.id,
          selectedCaseTitle: vivaCase.case.title,
          selectedCase: vivaCase,
          selectedMode: selectedModeFromUrl,
          selectedExaminerId: getDefaultExaminer(selectedModeFromUrl).id,
          selectedExaminer: getDefaultExaminer(selectedModeFromUrl),
          conversation: [],
          report: null,
        };

        window.localStorage.setItem("candidateInfo", JSON.stringify(storedValue));
        setSubmitted(true);

        return "Access granted! Starting viva";
      },
      error: "You are not allowed to access this viva",
    });
  };

  if (submitted) {
    return (
      <main className="min-h-screen bg-neutral-950 text-neutral-100">
        <VivaVoiceAi vivaCase={vivaCase} selectedMode={selectedModeFromUrl} />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.18),_transparent_40%),linear-gradient(180deg,_#020617_0%,_#0f172a_100%)] text-neutral-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-white/10 bg-slate-950/85 shadow-[0_24px_80px_rgba(2,6,23,0.55)] backdrop-blur-xl">
        <CardHeader>
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-400/10 text-emerald-300">
            AI
          </div>
          <CardTitle className="text-center text-slate-100">Candidate Information</CardTitle>
          <p className="text-center text-sm text-slate-400">{vivaCase.case.title}</p>
          <p className="text-center text-xs uppercase tracking-[0.24em] text-emerald-400">
            {selectedModeFromUrl === "fast" ? "Fast and Furious" : "Calm and Composed"}
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-slate-300 mb-1">
                Full Name
              </label>
              <input
                id="name"
                type="text"
                value={candidate.name}
                onChange={(e) => setCandidate({ ...candidate, name: e.target.value })}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your full name"
                required
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-1">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={candidate.email}
                onChange={(e) => setCandidate({ ...candidate, email: e.target.value })}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your email"
                required
              />
            </div>
            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white">
              Start Viva
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
