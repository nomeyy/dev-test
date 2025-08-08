import { NextResponse } from "next/server";
import { getConnectionMetrics } from "../../../../lib/sse";

export const runtime = "nodejs";

export async function GET() {
  try {
    const metrics = getConnectionMetrics();
    return NextResponse.json(metrics);
  } catch (_error) {
    return NextResponse.json(
      { error: "Failed to get metrics" },
      { status: 500 },
    );
  }
}
