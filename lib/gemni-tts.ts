import { GoogleGenAI } from "@google/genai";

export const geminiTtsClient = new GoogleGenAI(
  { apiKey: process.env.GEMINI_API_KEY! }
);
