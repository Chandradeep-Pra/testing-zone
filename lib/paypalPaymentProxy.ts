import { getAuthHeader, getUrologicsApiUrl } from "@/lib/urologics-api";
export async function forwardPayPalPayment(req: Request, action: "create-order" | "capture-order" | "quote") {
  const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };
  const authorization = getAuthHeader(req);
  if (!authorization) return Response.json({ error: "Authentication required" }, { status: 401, headers });
  if (req.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") return Response.json({ error: "JSON required" }, { status: 415, headers });
  try {
    const reader = req.body?.getReader(); if (!reader) return Response.json({ error: "Invalid request" }, { status: 400, headers });
    const chunks: Uint8Array[] = []; let length = 0;
    try { while (true) { const { done, value } = await reader.read(); if (done) break; length += value.byteLength; if (length > 8192) { await reader.cancel(); return Response.json({ error: "Request too large" }, { status: 413, headers }); } chunks.push(value); } }
    finally { reader.releaseLock(); }
    const response = await fetch(getUrologicsApiUrl(`/api/paypal/${action}`), { method: "POST", headers: { Authorization: authorization, "Content-Type": "application/json" }, body: Buffer.concat(chunks).toString("utf8"), cache: "no-store", signal: AbortSignal.timeout(45000) });
    return Response.json(await response.json(), { status: response.status, headers: { ...headers, ...(response.headers.get("retry-after") ? { "Retry-After": response.headers.get("retry-after")! } : {}) } });
  } catch { return Response.json({ error: "Payment verification is temporarily unavailable. Retry the same payment.", code: "PAYMENT_UNAVAILABLE", pending: true }, { status: 503, headers }); }
}
