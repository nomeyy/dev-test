import { NextResponse } from "next/server";
import { generateClientId } from "../../../../lib/sse";

export const runtime = "nodejs";

export async function POST() {
  try {
    const clientId = generateClientId();
    return NextResponse.json({ clientId });
  } catch (_error) {
    return NextResponse.json(
      { error: "Failed to generate client ID" },
      { status: 500 },
    );
  }
}
