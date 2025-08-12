import { sendEventToUser } from "@/features/sse";

export const runtime = "nodejs";
// Endpoint created for testing
export async function POST(
  request: Request,
  { params }: { params: { userId: string } },
) {
  try {
    const reqParams = await params;

    const { userId } = reqParams;
    if (!userId) return new Response("Bad Request", { status: 400 });

    const body = (await request.json().catch(() => null)) as {
      message?: string;
      event?: string;
      data?: unknown;
    } | null;
    const event = body?.event ?? "message";
    const data = body?.data ?? { text: body?.message ?? "" };

    const delivered = sendEventToUser(userId, event, data as any);
    return Response.json({ ok: true, delivered });
  } catch (error) {
    console.error("[SSE] Send to user error", error);
    return new Response("Internal Error", { status: 500 });
  }
}
