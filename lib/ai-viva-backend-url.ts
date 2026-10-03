export function getAiVivaBackendHttpBaseUrl(): string {
  const configured =
    process.env.NEXT_PUBLIC_AI_VIVA_BACKEND_HTTP_URL ||
    process.env.AI_VIVA_BACKEND_WS_URL ||
    process.env.AI_VIVA_WS_URL;
  const isLocalPage = typeof window !== "undefined" &&
    ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname);

  if (!configured && !isLocalPage) {
    throw new Error(
      "The AI Viva backend URL is not configured for this site. Set NEXT_PUBLIC_AI_VIVA_BACKEND_HTTP_URL or AI_VIVA_BACKEND_WS_URL.",
    );
  }

  const base = (configured || "http://localhost:8000")
    .trim()
    .replace(/\/+$/, "")
    .replace(/\/ws$/i, "")
    .replace(/^wss:/i, "https:")
    .replace(/^ws:/i, "http:");

  if (!/^https?:\/\//i.test(base)) {
    throw new Error("The AI Viva backend URL must start with http://, https://, ws://, or wss://.");
  }

  const isLoopback = ["localhost", "127.0.0.1", "::1"].includes(new URL(base).hostname);
  if (typeof window !== "undefined" && window.location.protocol === "https:" && base.startsWith("http://") && !isLoopback) {
    throw new Error("This secure site requires an https:// AI Viva backend URL.");
  }

  return base;
}
