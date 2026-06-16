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

  try {
    const { id } = await context.params;
    const response = await fetch(
      getUrologicsApiUrl(
        authHeader
          ? `/api/app/videos/${encodeURIComponent(id)}/stream`
          : `/api/public/videos/${encodeURIComponent(id)}/stream`
      ),
      {
        headers: {
          ...(authHeader ? { Authorization: authHeader } : {}),
          ...(req.headers.get("range") ? { Range: req.headers.get("range") as string } : {}),
        },
        cache: "no-store",
      }
    );

    if (authHeader && response.status === 401) {
      const publicResponse = await fetch(
        getUrologicsApiUrl(`/api/public/videos/${encodeURIComponent(id)}/stream`),
        {
          headers: {
            ...(req.headers.get("range") ? { Range: req.headers.get("range") as string } : {}),
          },
          cache: "no-store",
        }
      );

      return new Response(publicResponse.body, {
        status: publicResponse.status,
        headers: {
          "Content-Type": publicResponse.headers.get("content-type") || "video/mp4",
          ...(publicResponse.headers.get("content-length")
            ? { "Content-Length": publicResponse.headers.get("content-length") as string }
            : {}),
          ...(publicResponse.headers.get("content-range")
            ? { "Content-Range": publicResponse.headers.get("content-range") as string }
            : {}),
          ...(publicResponse.headers.get("accept-ranges")
            ? { "Accept-Ranges": publicResponse.headers.get("accept-ranges") as string }
            : {}),
          "Content-Disposition": "inline",
          "Cache-Control": "private, no-store, max-age=0",
          "X-Content-Type-Options": "nosniff",
        },
      });
    }

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
