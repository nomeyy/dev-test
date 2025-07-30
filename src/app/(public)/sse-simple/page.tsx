"use client";

import { useState, useEffect } from "react";

export default function SimpleSSEDemo() {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<string>("");
  const [messageCount, setMessageCount] = useState(0);

  // Add debugging to track component lifecycle
  console.log("SimpleSSEDemo render", { isConnected, messageCount });

  useEffect(() => {
    const connectionId = Math.random().toString(36).substr(2, 9);
    console.log(`Setting up SSE connection... (ID: ${connectionId})`);

    let eventSource: EventSource | null = null;
    let isActive = true;

    // Add a small delay to ensure the page is fully loaded
    const timer = setTimeout(() => {
      if (!isActive) return; // Component unmounted before timeout fired

      eventSource = new EventSource("/api/sse");
      console.log("EventSource created:", eventSource);

      eventSource.onopen = () => {
        if (!isActive) return;
        setIsConnected(true);
        console.log("SSE connected, readyState:", eventSource?.readyState);
      };

      // Debug: Log all events
      eventSource.addEventListener("open", () => {
        console.log("SSE open event fired");
      });

      eventSource.addEventListener("error", (event) => {
        console.log("SSE error event:", event);
      });

      eventSource.onmessage = (event) => {
        if (!isActive) return;
        console.log("SSE onmessage fired:", event.type, event.data);
        try {
          const data = JSON.parse(event.data);
          setLastMessage(JSON.stringify(data, null, 2));
          setMessageCount((prev) => prev + 1);
          console.log("Received SSE message:", event.type, data);
        } catch (error) {
          console.error("Failed to parse SSE message:", error);
        }
      };

      // Listen for specific event types
      eventSource.addEventListener("test-message", (event) => {
        if (!isActive) return;
        try {
          const data = JSON.parse(event.data);
          setLastMessage(JSON.stringify(data, null, 2));
          setMessageCount((prev) => prev + 1);
          console.log("Received test-message:", data);
        } catch (error) {
          console.error("Failed to parse test-message:", error);
        }
      });

      eventSource.addEventListener("ping", (event) => {
        if (!isActive) return;
        try {
          const data = JSON.parse(event.data);
          console.log("Received ping:", data);
        } catch (error) {
          console.error("Failed to parse ping:", error);
        }
      });

      eventSource.onerror = (error) => {
        if (!isActive) return;
        setIsConnected(false);
        console.error("SSE error:", error);
        console.error("SSE error details:", {
          readyState: eventSource?.readyState,
          url: eventSource?.url,
          error: error,
        });
      };
    }, 100);

    return () => {
      console.log(`Cleaning up SSE connection... (ID: ${connectionId})`);
      isActive = false;
      clearTimeout(timer);
      if (eventSource) {
        console.log("Closing EventSource connection...");
        eventSource.close();
      }
    };
  }, []);

  const sendTestMessage = async () => {
    try {
      console.log("Sending test message...");
      const response = await fetch("/api/sse/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          event: "test-message",
          data: {
            message: `Test message ${Date.now()}`,
            timestamp: new Date().toISOString(),
          },
        }),
      });

      if (response.ok) {
        console.log("Test message sent successfully");
      } else {
        console.error(
          "Failed to send test message:",
          response.status,
          response.statusText,
        );
      }
    } catch (error) {
      console.error("Failed to send test message:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto max-w-2xl px-4">
        <h1 className="mb-8 text-center text-3xl font-bold text-black">
          Simple SSE Demo
        </h1>

        <div className="space-y-4 rounded-lg bg-white p-6 shadow-md">
          <div className="flex items-center gap-2">
            <div
              className={`h-3 w-3 rounded-full ${
                isConnected ? "bg-green-500" : "bg-red-500"
              }`}
            />
            <span className="font-medium text-black">
              Status: {isConnected ? "Connected" : "Disconnected"}
            </span>
          </div>

          <button
            onClick={sendTestMessage}
            disabled={!isConnected}
            className="w-full rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            Send Test Message
          </button>

          {lastMessage && (
            <div className="rounded border bg-gray-50 p-4">
              <h3 className="mb-2 font-medium">Last Message:</h3>
              <pre className="overflow-auto rounded border bg-white p-2 text-sm">
                {lastMessage}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
