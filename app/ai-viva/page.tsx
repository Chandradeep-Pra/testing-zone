"use client";

import { useRouter } from "next/navigation";
import {
  PlayCircle,
  Clock,
  Mic,
  FileText,
  Stethoscope,
} from "lucide-react";

import { vivaContext } from "@/ai-viva-data/vivaContext";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function VivaIntroPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-8">
      <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 gap-8">

        {/* LEFT — CASE DETAILS */}
        <Card className="bg-slate-900 border-slate-800 shadow-xl rounded-2xl">
          <CardHeader className="space-y-4">
            <div className="flex items-center gap-2 text-emerald-400 text-sm uppercase tracking-wide font-medium">
              <Stethoscope size={16} />
              Case Overview
            </div>

            <CardTitle className="text-3xl font-semibold text-slate-100">
              {vivaContext.case.title}
            </CardTitle>

            <CardDescription>
              <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Level: {vivaContext.case.level}
              </Badge>
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5">
            <p className="text-slate-300 leading-relaxed">
              {vivaContext.case.stem}
            </p>

            <div>
              <h3 className="text-sm font-semibold text-slate-200 mb-3">
                Objectives
              </h3>
              <ul className="space-y-2 text-sm text-slate-400">
                {vivaContext.case.objectives.map((obj, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    {obj}
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* RIGHT — INSTRUCTIONS */}
        <Card className="bg-slate-900 border-slate-800 shadow-xl rounded-2xl flex flex-col justify-between">
          <CardHeader>
            <div className="flex items-center gap-2 text-slate-400 text-sm uppercase tracking-wide font-medium">
              <FileText size={16} />
              Viva Instructions
            </div>
          </CardHeader>

          <CardContent className="space-y-5 text-sm text-slate-300">
            <div className="flex items-center gap-3">
              <Clock size={16} className="text-emerald-400" />
              <span>
                Duration: {vivaContext.viva_rules.max_duration_minutes} minutes
              </span>
            </div>

            <div className="flex items-center gap-3">
              <Mic size={16} className="text-emerald-400" />
              <span>Voice-based, one question at a time</span>
            </div>

            <div className="flex items-center gap-3">
              <PlayCircle size={16} className="text-emerald-400" />
              <span>Examiner-led structured viva</span>
            </div>

            <p className="text-xs text-slate-500 pt-3">
              This is a simulated clinical viva examination.
              The examiner will adapt questions based on your responses.
              A structured score report will be provided at the end.
            </p>
          </CardContent>

          <CardFooter>
            <Button
              size="lg"
              className="w-full gap-2 bg-emerald-600 hover:bg-emerald-500 text-white"
              onClick={() => router.push("/ai-viva/session")}
            >
              <PlayCircle size={18} />
              Start Viva
            </Button>
          </CardFooter>
        </Card>

      </div>
    </main>
  );
}