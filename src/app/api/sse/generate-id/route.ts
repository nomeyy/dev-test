import { NextResponse } from "next/server";
import { generateClientId } from "../../../../lib/sse";

export const runtime = "nodejs";

export async function POST() {
  try {
    const clientId = generateClientId();
    return NextResponse.json({ clientId });
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
