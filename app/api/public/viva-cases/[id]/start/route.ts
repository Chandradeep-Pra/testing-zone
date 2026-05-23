import { NextResponse } from "next/server";

import { startRemotePublicViva } from "@/lib/viva-case";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = (await request.json()) as {
      name?: unknown;
      email?: unknown;
      source?: unknown;
    };

    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const source =
      typeof body.source === "string" && body.source.trim()
        ? body.source.trim()
        : "external-web";

    if (!name || !EMAIL_PATTERN.test(email)) {
      return NextResponse.json(
        { error: "Please enter your name and a valid email." },
        { status: 400 }
      );
    }

    const result = await startRemotePublicViva(id, {
      name,
      email,
      source,
    });

    return NextResponse.json(result);
  } catch (error) {
    const status = (error as { status?: number }).status;

    if (status === 400) {
      return NextResponse.json(
        { error: "Please enter your name and a valid email." },
        { status: 400 }
      );
    }

    if (status === 404) {
      return NextResponse.json(
        { error: "This viva case is not publicly available." },
        { status: 404 }
      );
    }

    console.error("Failed to start public viva:", error);
    return NextResponse.json(
      { error: "We could not start the viva right now. Please try again." },
      { status: 500 }
    );
  }
}
