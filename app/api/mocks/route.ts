import { NextRequest, NextResponse } from "next/server";
import { getUrologicsApiUrl } from "@/lib/urologics-api";

type MockPayload = {
  mocks?: Array<{
    accessType?: string;
    access?: {
      allowed?: boolean;
      mode?: string;
      courseIds?: unknown;
    };
  }>;
};

function hasEntitledMemberAccess(mock: NonNullable<MockPayload["mocks"]>[number]) {
  const courseIds = Array.isArray(mock.access?.courseIds)
    ? mock.access.courseIds.filter((id) => typeof id === "string" && id.trim().length > 0)
    : [];

  return (
    mock.access?.allowed === true &&
    mock.access?.mode === "full" &&
    courseIds.length > 0
  );
}

function onlyVisibleMocks(payload: MockPayload) {
  return {
    ...payload,
    mocks: (payload.mocks || []).filter(
      (mock) => mock.accessType === "public" || hasEntitledMemberAccess(mock),
    ),
  };
}

export async function GET(req: NextRequest) {
  const idToken = req.cookies.get("urologics_id_token")?.value;

  if (!idToken) {
    try {
      const response = await fetch(getUrologicsApiUrl("/api/public/mocks"), {
        cache: "no-store",
      });
      const payload = await response.json().catch(() => ({}));

      return NextResponse.json(payload, { status: response.status });
    } catch (error) {
      console.error("Failed to load public mocks:", error);

      return NextResponse.json(
        { error: "Failed to load mocks" },
        { status: 500 }
      );
    }
  }

  try {
    const response = await fetch(getUrologicsApiUrl("/api/app/mocks"), {
      headers: {
        Authorization: `Bearer ${idToken}`,
      },
      cache: "no-store",
    });
    const payload = await response.json().catch(() => ({}));

    return NextResponse.json(onlyVisibleMocks(payload), { status: response.status });
  } catch (error) {
    console.error("Failed to load mocks:", error);

    return NextResponse.json(
      { error: "Failed to load mocks" },
      { status: 500 }
    );
  }
}
