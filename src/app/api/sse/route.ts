import { NextRequest } from "next/server";
import { auth as getServerSession } from "@/features/auth/handlers";
import { sse as manager } from "@/server/sse";
import { randomUUID } from "crypto";
import { log } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function sseLine(evt: { event?: string; data?: any; id?: string; retry?: number }) {
  let out = "";
  if (evt.id) out += `id: ${evt.id}\n`;
  if (evt.retry) out += `retry: ${evt.retry}\n`;
  if (evt.event) out += `event: ${evt.event}\n`;
  if (evt.data !== undefined) out += `data: ${typeof evt.data === "string" ? evt.data : JSON.stringify(evt.data)}\n`;
  return out + "\n";
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      log.warn("Unauthorized SSE connection attempt");
      return new Response("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const topics = (searchParams.get("topic") ?? "")
      .split(",").map(s => s.trim()).filter(Boolean);
    
    const connId = randomUUID();
    const sessionId = (session as any).sessionToken as string | undefined;
    const userAgent = req.headers.get("user-agent") || undefined;
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";

    log.info("SSE connection request", {
      connId,
      userId: session.user.id,
      sessionId,
      topics,
      userAgent,
      ip
    });

    const stream = new ReadableStream({
      start: async (controller) => {
        const enc = new TextEncoder();
        const write = (s: string) => {
          try {
            controller.enqueue(enc.encode(s));
          } catch (error) {
            log.error("Failed to write to SSE stream", { connId, error });
          }
        };

        // Send initial connection setup
        write(sseLine({ retry: 5000 }));

        try {
          const unregister = await manager.register({
            connId,
            userId: session.user.id,
            sessionId,
            topics,
            userAgent,
            ip,
            send: (evt) => {
              try {
                write(sseLine({ 
                  event: evt.event, 
                  data: evt.data,
                  id: evt.id 
                }));
              } catch (error) {
                log.error("Failed to send SSE event to client", { 
                  connId, 
                  event: evt.event, 
                  error 
                });
              }
            },
          });

          // Send welcome message
          write(sseLine({ 
            event: "welcome", 
            data: { 
              connId, 
              userId: session.user.id,
              sessionId,
              timestamp: Date.now() 
            } 
          }));

          // Set up heartbeat
          const heartbeatInterval = setInterval(() => {
            try {
              write(`: heartbeat ${Date.now()}\n\n`);
            } catch (error) {
              log.error("Failed to send heartbeat", { connId, error });
            }
          }, 30000);

          // Handle connection cleanup
          const cleanup = async () => {
            clearInterval(heartbeatInterval);
            await unregister();
            try {
              controller.close();
            } catch (error) {
              log.error("Error closing SSE stream", { connId, error });
            }
          };

          // Listen for abort signal
          req.signal.addEventListener("abort", cleanup);

          // Handle stream errors
          req.signal.addEventListener("error", (error) => {
            log.error("SSE stream error", { connId, error });
            cleanup();
          });

        } catch (error) {
          log.error("Failed to register SSE connection", { connId, error });
          write(sseLine({ 
            event: "error", 
            data: { 
              message: "Failed to establish connection",
              code: "CONNECTION_ERROR"
            } 
          }));
          controller.close();
        }
      },
      cancel: async () => {
        try {
          await manager.unregister(connId);
          log.info("SSE connection cancelled", { connId });
        } catch (error) {
          log.error("Error during SSE connection cancellation", { connId, error });
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Cache-Control",
      },
    });
  } catch (error) {
    log.error("SSE route error", { error });
    return new Response("Internal Server Error", { status: 500 });
  }
}
