import { NextResponse } from "next/server";
import { getClientDetails } from "../../../../lib/sse";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const clients = getClientDetails();
    return NextResponse.json({ clients });
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
