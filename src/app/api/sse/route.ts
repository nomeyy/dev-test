import { NextRequest } from "next/server";
import { sseManager } from "@/lib/sse/SSEManager";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "userId parameter is required" }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        },
      );
    }

    const stream = new ReadableStream({
      start(controller) {
        const mockResponse = {
          write: (chunk: string) => {
            try {
              const encoder = new TextEncoder();
              controller.enqueue(encoder.encode(chunk));
            } catch (error) {
              console.error("[SSE] Error writing to stream:", error);
            }
          },
          end: () => {
            try {
              controller.close();
            } catch (error) {
              console.error("[SSE] Error closing stream:", error);
            }
          },
          destroyed: false,
          on: (event: string, callback: (error?: any) => void) => {
            if (event === "close") {
              (mockResponse as any).closeCallback = callback;
            }
            if (event === "error") {
              (mockResponse as any).errorCallback = callback;
            }
          },
          writeHead: (status: number, headers: Record<string, string>) => {},
        };

        try {
          sseManager.addClient(userId, mockResponse as any);
        } catch (error) {
          console.error("[SSE] Error adding client:", error);
          controller.close();
        }

        request.signal.addEventListener("abort", () => {
          sseManager.removeClient(userId);
          if ((mockResponse as any).closeCallback) {
            (mockResponse as any).closeCallback();
          }
        });
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Cache-Control",
      },
    });
  } catch (error) {
    console.error("[SSE] Error in SSE route:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Cache-Control",
    },
  });
}
