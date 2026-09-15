const UROLOGICS_API_BASE =
  process.env.UROLOGICS_API_BASE ||
  process.env.VIVA_API_BASE ||
  process.env.NEXT_PUBLIC_UROLOGICS_API_BASE_URL ||
  (process.env.NODE_ENV === "production" ? "https://urologics.co.uk" : "http://127.0.0.1:3000");

export function getUrologicsApiUrl(path: string) {
  return `${UROLOGICS_API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
}

export function getAuthHeader(req: Request) {
  const authHeader = req.headers.get("authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  return authHeader;
}

export async function forwardUrologicsJson(req: Request, path: string) {
  const upstream = new URL(getUrologicsApiUrl(path));
  upstream.search = new URL(req.url).search;
  const authHeader = getAuthHeader(req);
  const requestHeaders = new Headers();
  if (authHeader) requestHeaders.set("Authorization", authHeader);
  const requestId = req.headers.get("x-request-id");
  if (requestId) requestHeaders.set("x-request-id", requestId);
  const response = await fetch(upstream, {
    headers: requestHeaders,
    signal: req.signal,
    cache: "no-store",
  });
  const headers = new Headers();
  for (const name of ["content-type", "cache-control", "server-timing", "x-request-id", "etag", "vary", "retry-after"]) {
    const value = response.headers.get(name);
    if (value) headers.set(name, value);
  }
  if (authHeader || !response.ok) headers.set("Cache-Control", "private, no-store");
  return new Response(response.body, { status: response.status, headers });
}
