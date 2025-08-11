import type { NextRequest } from "next/server";
import { z } from "zod";
import { SseHelpers } from "@/lib/sse/manager";

export const runtime = "nodejs";

const bodySchema = z.object({
  event: z.string().min(1),
  data: z.union([z.record(z.unknown()), z.string(), z.number(), z.boolean(), z.null()]),
  clientId: z.string().optional(),
  userId: z.string().optional(),
});

export async function POST(req: NextRequest): Promise<Response> {
  try {
    const json = (await req.json()) as unknown;
    const { event, data, clientId, userId } = bodySchema.parse(json);

    let count = 0;
    if (clientId) {
      count = SseHelpers.emitToClient(clientId, { event, data });
    } else if (userId) {
      count = SseHelpers.emitToUser(userId, { event, data });
    } else {
      count = SseHelpers.broadcast({ event, data });
    }

    return Response.json({ ok: true, delivered: count });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ ok: false, error: message }, { status: 400 });
  }
} 