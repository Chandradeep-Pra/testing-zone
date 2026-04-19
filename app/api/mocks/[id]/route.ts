import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const res = await fetch(
      `https://urocms.vercel.app/api/mocks/${id}`,
      {
        cache: "no-store",
      }
    );

    const data = await res.json();

    return NextResponse.json(data);

  } catch (err) {
    console.error("Proxy error:", err);

    return NextResponse.json(
      { error: "Failed to fetch mock" },
      { status: 500 }
    );
  }
}