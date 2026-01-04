//@ts-nocheck
import { GoogleGenAI } from "@google/genai";

export const geminiTtsClient = new GoogleGenAI(
  process.env.GEMINI_API_KEY!
);
