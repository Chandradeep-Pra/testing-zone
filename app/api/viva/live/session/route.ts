import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI, Modality } from "@google/genai";
import { normalizeVivaCase, getDefaultVivaCase } from "@/lib/viva-case";

export async function POST(req: NextRequest) {
  try {
    const { vivaCase: rawCase, persona } = await req.json();
    const vivaCase = rawCase ? normalizeVivaCase(rawCase) : getDefaultVivaCase();
    
    const apiKey = process.env.GEMINI_LIVE_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Missing GEMINI_LIVE_API_KEY" }, { status: 500 });
    }

    const client = new GoogleGenAI({ 
      apiKey,
      httpOptions: { apiVersion: "v1alpha" } 
    });

    // We mint a restricted token for the frontend to use
    const tokenResponse = await client.authTokens.create({
      config: {
        uses: 1,
        liveConnectConstraints: {
          model: "gemini-3.6-flash",
          config: {
            responseModalities: [Modality.AUDIO],
            systemInstruction: {
              parts: [{
                text: `
                  ${persona?.systemInstruction || "You are a UK Consultant conducting a medical viva."}
                  
                  CASE CONTEXT:
                  Title: ${vivaCase.case.title}
                  Stem: ${vivaCase.case.stem}
                  Objectives: ${vivaCase.case.objectives.join(", ")}
                  
                  RULES:
                  1. Conduct the viva exactly as the teacher in the provided persona.
                  2. Use a concise, professional British clinical tone.
                  3. If the candidate gives a partial answer, probe further.
                  4. Do not reveal hidden facts unless the candidate asks or performs the correct investigation.
                  5. Only one question at a time.
                `
              }]
            }
          }
        }
      }
    });

    return NextResponse.json({ 
      token: tokenResponse.name,
      model: "gemini-2.5-flash"
    });
    
  } catch (error) {
    console.error("Live session creation error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
