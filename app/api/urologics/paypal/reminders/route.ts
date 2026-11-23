import { NextRequest } from "next/server";
import { getAuthHeader, getUrologicsApiUrl } from "@/lib/urologics-api";
async function forward(req: NextRequest) {
  const authorization = getAuthHeader(req);
  const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };
  if (!authorization) return Response.json({ error: "Authentication required" }, { status: 401, headers });
  try {
    let body: string | undefined;
    if (req.method === "POST") {
      if (req.headers.get("content-type")?.split(";")[0] !== "application/json") return Response.json({ error: "JSON required" }, { status: 415, headers });
      const reader = req.body?.getReader(); if (!reader) return Response.json({ error: "Invalid request" }, { status: 400, headers });
      const chunks: Uint8Array[] = []; let length = 0;
      try { while (true) { const { done, value } = await reader.read(); if (done) break; length += value.byteLength; if (length > 8192) { await reader.cancel(); return Response.json({ error: "Request too large" }, { status: 413, headers }); } chunks.push(value); } }
      finally { reader.releaseLock(); }
      body = Buffer.concat(chunks).toString("utf8");
    }
    const response = await fetch(getUrologicsApiUrl("/api/paypal/reminders"), { method: req.method, headers: { Authorization: authorization, "Content-Type": "application/json" }, body, cache: "no-store", signal: AbortSignal.timeout(15000) });
    return Response.json(await response.json(), { status: response.status, headers });
  } catch { return Response.json({ error: "Reminders are temporarily unavailable" }, { status: 502, headers }); }
}
export const GET = forward;
export const POST = forward;
