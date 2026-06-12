import { NextRequest, NextResponse } from "next/server";
import { getAuthHeader, getUrologicsApiUrl } from "@/lib/urologics-api";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const authHeader =
    getAuthHeader(req) ||
    (req.cookies.get("urologics_id_token")?.value
      ? `Bearer ${req.cookies.get("urologics_id_token")?.value}`
      : null);

  if (!authHeader) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const response = await fetch(
      getUrologicsApiUrl(`/api/app/videos/${encodeURIComponent(id)}/stream`),
      {
        headers: {
          Authorization: authHeader,
          ...(req.headers.get("range") ? { Range: req.headers.get("range") as string } : {}),
        },
        cache: "no-store",
      }
    );

    return new Response(response.body, {
      status: response.status,
      headers: {
        "Content-Type": response.headers.get("content-type") || "video/mp4",
        ...(response.headers.get("content-length")
          ? { "Content-Length": response.headers.get("content-length") as string }
          : {}),
        ...(response.headers.get("content-range")
          ? { "Content-Range": response.headers.get("content-range") as string }
          : {}),
        ...(response.headers.get("accept-ranges")
          ? { "Accept-Ranges": response.headers.get("accept-ranges") as string }
          : {}),
        "Content-Disposition": "inline",
        "Cache-Control": "private, no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Urologics video stream proxy error:", error);
    return NextResponse.json(
      { error: "Failed to stream Urologics video" },
      { status: 500 }
    );
  }
}
