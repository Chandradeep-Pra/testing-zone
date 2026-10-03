import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI, Modality } from "@google/genai";
import { normalizeVivaCase, fetchRemotePublicVivaCaseById, type VivaCaseRecord } from "@/lib/viva-case";
import { normalizeSessionStartPayload, buildSessionStartPrompt } from "@/lib/session-start";
import { EXAMINER_VOICES, type VivaMode } from "@/lib/examiner-voices";
import { getUrologicsApiUrl } from "@/lib/urologics-api";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.json().catch(() => ({}));
    const startupPayload = normalizeSessionStartPayload(rawBody);
    const caseId = typeof rawBody.caseId === "string" ? rawBody.caseId.trim() : startupPayload.case.id?.trim();
    const mode: VivaMode = rawBody.mode === "fast" ? "fast" : "calm";
    const examiner = EXAMINER_VOICES[mode].find((item) => item.id === rawBody.examinerId) || EXAMINER_VOICES[mode][0];
    const authHeader = req.headers.get("authorization");
    let vivaCase: VivaCaseRecord | null = null;

    if (rawBody.case && typeof rawBody.case === "object") {
      vivaCase = normalizeVivaCase(rawBody.case);
    } else if (typeof caseId === "string" && caseId.trim()) {
      if (authHeader?.startsWith("Bearer ")) {
        const response = await fetch(getUrologicsApiUrl("/api/app/viva-cases"), {
          headers: { Authorization: authHeader },
          cache: "no-store",
        });
        const payload = await response.json().catch(() => ({})) as {
          cases?: Array<VivaCaseRecord & { access?: { allowed?: boolean } }>;
        };
        if (!response.ok) return NextResponse.json({ error: "Unable to verify access to this viva case." }, { status: response.status });
        const record = (payload.cases || []).find((item) => item.id === caseId);
        if (!record || record.access?.allowed === false) {
          return NextResponse.json({ error: "This viva case is not available for your account." }, { status: 403 });
        }
        vivaCase = normalizeVivaCase(record);
      } else {
        vivaCase = await fetchRemotePublicVivaCaseById(caseId);
        if (!vivaCase) return NextResponse.json({ error: "This viva case is not publicly available." }, { status: 404 });
      }
    } else {
      return NextResponse.json({ error: "A viva case is required." }, { status: 400 });
    }

    if (!vivaCase) {
      return NextResponse.json({ error: "A viva case is required." }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_LIVE_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Missing GEMINI_LIVE_API_KEY" }, { status: 500 });
    }

    const model = process.env.GEMINI_LIVE_MODEL || "gemini-2.5-flash-native-audio-latest";

    const client = new GoogleGenAI({
      apiKey,
      httpOptions: { apiVersion: "v1alpha", timeout: 20000 }
    });

    const tokenResponse = await client.authTokens.create({
      config: {
        uses: 1,
        newSessionExpireTime: new Date(Date.now() + 120000).toISOString(),
        expireTime: new Date(Date.now() + 300000).toISOString(),
        liveConnectConstraints: {
          model,
          config: {
            responseModalities: [Modality.AUDIO],
            inputAudioTranscription: {},
            outputAudioTranscription: {},
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: examiner.voiceName } } },
            systemInstruction: {
              parts: [{
                text: `
                  You are ${examiner.name}, a UK Consultant Urological Surgeon conducting a realistic FRCS Urology viva. ${examiner.personality}
                  Speak in natural British English (${examiner.languageCode}). Be concise, responsive, and clinically rigorous. This is a live spoken exam, not a lecture.

                  CANDIDATE CONTEXT:
                  ${buildSessionStartPrompt(startupPayload.candidate, startupPayload.case)}

                  CASE CONTEXT:
                  Title: ${vivaCase.case.title}
                  Stem: ${vivaCase.case.stem}
                  Objectives: ${vivaCase.case.objectives.join(", ")}
                  Marking points: ${vivaCase.marking_criteria.must_mention.join(", ")}
                  Critical safety omissions: ${vivaCase.marking_criteria.critical_fail.join(", ")}

                  RULES:
                  1. If the candidate gives a partial answer, probe further.
                  2. Do not reveal investigation results or exhibit findings unless the candidate asks for or performs the relevant investigation.
                  3. Only one question at a time.
                  4. Begin by presenting the opening stem, then let the candidate lead their assessment. Probe partial answers, acknowledge interruptions, and never repeat the entire stem after an interruption.
                  5. Do not claim that an exhibit has been shown; ask the candidate to request the relevant investigation.
                `
              }]
            }
          }
        }
      }
    });

    if (!tokenResponse?.name) {
      throw new Error("Gemini returned an invalid live token payload.");
    }

    return NextResponse.json({
      token: tokenResponse.name,
      model,
    });
    
  } catch (error) {
    console.error("Live session creation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create the live viva session." },
      { status: 500 }
    );
  }
}
