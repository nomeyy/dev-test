"use client";
import { SSEProvider, SSEDemo } from "@/features/sse";

/**
 * SSE Test Page
 * Demonstrates the SSE functionality with connection management and event broadcasting
 */
export default function SSETestPage() {
  return (
    <div className="min-h-screen">
      <div className="container mx-auto py-8">
        <h1 className="mb-8 text-center text-3xl font-bold">
          SSE (Server-Sent Events) Test
        </h1>

        <SSEProvider
          autoConnect={true}
          reconnectInterval={5000}
          maxReconnectAttempts={5}
          onOpen={() => console.log("SSE connection opened")}
          onClose={() => console.log("SSE connection closed")}
          onError={(error) => console.error("SSE connection error:", error)}
          onMessage={(event) => console.log("SSE event received:", event)}
        >
          <SSEDemo />
        </SSEProvider>
      </div>
    </div>
  );
}
