import { NextResponse } from "next/server";
import { getConnectionMetrics } from "../../../../lib/sse";

export const runtime = "nodejs";

export async function GET() {
  try {
    const metrics = getConnectionMetrics();
    return NextResponse.json(metrics);
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error: `Failed to get client details, ${
          error instanceof Error ? error.message : String(error)
        }`,
      },
      { status: 500 },
    );
  }
}
