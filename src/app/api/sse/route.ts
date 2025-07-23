import { NextRequest } from "next/server";
import { sseManager } from "@/lib/sse/sse";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const clientId = searchParams.get("id") || crypto.randomUUID();

  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  writer.write(new TextEncoder().encode("retry: 10000\n\n"));

  sseManager.addClient(clientId, {
    id: clientId,
    write: (chunk: string) => {
      writer.write(new TextEncoder().encode(chunk));
    },
  });

  req.signal?.addEventListener("abort", () => {
    sseManager.removeClient(clientId);
    writer.close();
  });

  return new Response(stream.readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
