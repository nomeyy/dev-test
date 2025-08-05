import { sseHandleError, sseLogs, sseManager } from "@/lib/sse";
import type { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();
    const userId = req.headers.get("x-user-id") ?? crypto.randomUUID();
    const headers = new Headers({
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Cache-Control",
    });

    const response = new Response(readable, { headers });

    req.signal.addEventListener("abort", () => {
      sseLogs.info("Request aborted, cleaning up");
      (async () => {
        try {
          sseManager.removeClient(userId);
          await writer.close();
        } catch (error) {
          sseHandleError("Error during cleanup:", error);
        }
      })().catch(console.error);
    });

    setImmediate(() => {
      (async () => {
        try {
          await writer.write(encoder.encode(`data: connected\n\n`));
          sseManager.addClient(userId, {
            write: async (chunk: string) => {
              try {
                await writer.write(encoder.encode(chunk));
              } catch (error) {
                sseHandleError("Error writing chunk:", error);
                sseManager.removeClient(userId);
              }
            },
            end: async () => {
              try {
                await writer.close();
              } catch (error) {
                sseHandleError("Error closing writer:", error);
              }
              sseManager.removeClient(userId);
            },
          });
        } catch (error) {
          sseHandleError("Error in setImmediate block:", error);
        }
      })().catch((error) => sseHandleError("Error", error));
    });
    return response;
  } catch (error) {
    sseHandleError("Error in GET handler:", error);
    return new Response(
      `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      {
        status: 500,
        headers: { "Content-Type": "text/plain" },
      },
    );
  }
}
