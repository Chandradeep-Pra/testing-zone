import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI, Modality } from "@google/genai";
import { normalizeVivaCase, fetchRemotePublicVivaCaseById, type VivaCaseRecord } from "@/lib/viva-case";
import { normalizeSessionStartPayload, buildSessionStartPrompt } from "@/lib/session-start";
import { EXAMINER_VOICES, type VivaMode } from "@/lib/examiner-voices";
import { getUrologicsApiUrl } from "@/lib/urologics-api";

export async function POST(req: NextRequest) {
  try {
    const { vivaCase: rawCase, persona } = await req.json();
    const vivaCase = rawCase ? normalizeVivaCase(rawCase) : getDefaultVivaCase();
    
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Missing GEMINI_API_KEY" }, { status: 500 });
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
