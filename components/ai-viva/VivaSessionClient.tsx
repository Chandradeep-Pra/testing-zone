"use client";

import { useState } from "react";

import VivaVoiceAi from "@/components/ai-viva/VivaVoiceAi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { VivaCaseRecord } from "@/lib/viva-case";
import toast from "react-hot-toast";

type CandidateInfo = {
  name: string;
  email: string;
};

type StoredCandidateInfo = CandidateInfo & {
  selectedCaseId?: string;
  selectedCaseTitle?: string;
  selectedCase?: VivaCaseRecord;
  conversation?: unknown[];
  report?: unknown;
};

function getStoredCandidate(vivaCase: VivaCaseRecord): {
  candidate: CandidateInfo;
  submitted: boolean;
} {
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

    const parsed = JSON.parse(raw) as StoredCandidateInfo;
    return {
      candidate: {
        name: parsed.name || "",
        email: parsed.email || "",
      },
      submitted:
        Boolean(parsed.name && parsed.email) && parsed.selectedCaseId === vivaCase.id,
    };
  } catch {
    return {
      candidate: { name: "", email: "" },
      submitted: false,
    };
  }
}

export default function VivaSessionClient({ vivaCase }: { vivaCase: VivaCaseRecord }) {
  const initialState = getStoredCandidate(vivaCase);
  const [candidate, setCandidate] = useState<CandidateInfo>(initialState.candidate);
  const [submitted, setSubmitted] = useState(initialState.submitted);

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  const name = candidate.name.trim();
  const email = candidate.email.trim().toLowerCase();

  if (!name || !email) {
    toast.error("Please fill all fields");
    return;
  }

  // 🔄 LOADING TOAST (promise style)
  const checkAccess = new Promise<boolean>((resolve) => {
    setTimeout(() => {
      const isAllowed =
        Array.isArray(vivaCase.allowedUser) &&
        vivaCase.allowedUser.includes(email);
        console.log("Current Viva Case is :", vivaCase)

      resolve(isAllowed);
    }, 3000); // ⏳ 3 sec delay
  });

  toast.promise(checkAccess, {
    loading: "Checking access...",
    success: (isAllowed) => {
      if (!isAllowed) {
        throw new Error("Not allowed");
      }

      // ✅ STORE DATA
      const storedValue: StoredCandidateInfo = {
        name,
        email,
        selectedCaseId: vivaCase.id,
        selectedCaseTitle: vivaCase.case.title,
        selectedCase: vivaCase,
        conversation: [],
        report: null,
      };

      window.localStorage.setItem("candidateInfo", JSON.stringify(storedValue));

      setSubmitted(true);

      return "Access granted! Starting viva 🚀";
    },
    error: "You are not allowed to access this viva ❌",
  });
};

  if (submitted) {
    return (
      <main className="min-h-screen bg-neutral-950 text-neutral-100">
        <VivaVoiceAi vivaCase={vivaCase} />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-slate-900 border-slate-700">
        <CardHeader>
          <CardTitle className="text-center text-slate-100">Candidate Information</CardTitle>
          <p className="text-center text-sm text-slate-400">{vivaCase.case.title}</p>
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
