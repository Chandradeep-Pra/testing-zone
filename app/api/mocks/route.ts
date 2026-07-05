import { NextRequest, NextResponse } from "next/server";
import { getUrologicsApiUrl } from "@/lib/urologics-api";

export const dynamic = "force-dynamic";

type MockPayload = {
  mocks?: Array<{
    accessType?: string;
    access?: {
      allowed?: boolean;
      mode?: string;
    };
  }>;
};

function hasEntitledMemberAccess(mock: NonNullable<MockPayload["mocks"]>[number]) {
  return mock.access?.allowed === true && mock.access?.mode !== "locked";
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

    return NextResponse.json(onlyVisibleMocks(payload), {
      status: response.status,
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error) {
    console.error("Failed to load mocks:", error);

    return NextResponse.json(
      { error: "Failed to load mocks" },
      { status: 500 }
    );
  }
}
