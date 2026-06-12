const UROLOGICS_API_BASE =
  process.env.UROLOGICS_API_BASE ||
  process.env.VIVA_API_BASE ||
  process.env.NEXT_PUBLIC_UROLOGICS_API_BASE_URL ||
  "https://urologics.co.uk";

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
