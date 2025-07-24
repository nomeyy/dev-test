"use client";

import { useState, useEffect } from "react";

export default function SSETestPage() {
  const [latestMessage, setLatestMessage] = useState<string>("No messages yet");
  const [connectionStatus, setConnectionStatus] =
    useState<string>("Disconnected");
  const [eventSource, setEventSource] = useState<EventSource | null>(null);

  const connectToSSE = () => {
    try {
      const eventSource = new EventSource("/api/sse");

      eventSource.onopen = () => {
        setConnectionStatus("Connected");
        setLatestMessage("Connected to SSE stream");
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data as string) as {
            type: string;
            data: unknown;
          };
          setLatestMessage(
            `Received: ${data.type} - ${JSON.stringify(data.data)}`,
          );
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (error) {
          setLatestMessage(`Received raw message: ${event.data as string}`);
        }
      };

      eventSource.onerror = (error) => {
        setConnectionStatus("Error");
        const errorMessage =
          error instanceof Event
            ? `EventSource error: ${error.type}`
            : `Unknown error: ${String(error)}`;
        setLatestMessage(errorMessage);
      };

      setEventSource(eventSource);
    } catch (error) {
      setLatestMessage(
        `Failed to connect: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  };

  const disconnectFromSSE = () => {
    if (eventSource) {
      eventSource.close();
      setEventSource(null);
      setConnectionStatus("Disconnected");
      setLatestMessage("Disconnected from SSE stream");
    }
  };

  const sendTestEvent = async () => {
    try {
      const response = await fetch("/api/sse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventType: "user.notification",
          data: { message: "Test notification from UI", timestamp: Date.now() },
        }),
      });

      const result = (await response.json()) as { message: string };
      setLatestMessage(`Test event result: ${result.message}`);
    } catch (error) {
      setLatestMessage(
        `Failed to send test event: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  };

  const sendUploadProgress = async () => {
    try {
      const progress = Math.floor(Math.random() * 100);
      const response = await fetch("/api/sse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventType: "upload.progress",
          data: { progress, uploadId: `test-upload-${Date.now()}` },
        }),
      });

      const result = (await response.json()) as { message: string };
      setLatestMessage(`Upload progress ${progress}% sent: ${result.message}`);
    } catch (error) {
      setLatestMessage(
        `Failed to send upload progress: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  };

  const sendUploadComplete = async () => {
    try {
      const response = await fetch("/api/sse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventType: "upload.complete",
          data: {
            uploadId: `test-upload-${Date.now()}`,
            playbackId: `playback-${Date.now()}`,
          },
        }),
      });

      const result = (await response.json()) as { message: string };
      setLatestMessage(`Upload complete sent: ${result.message}`);
    } catch (error) {
      setLatestMessage(
        `Failed to send upload complete: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  };

  useEffect(() => {
    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [eventSource]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-8">
      <div className="container mx-auto max-w-2xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-white">SSE Test Interface</h1>
          <a
            href="/home"
            className="rounded-md border border-white/30 bg-white/10 px-4 py-2 text-white backdrop-blur-sm transition-colors hover:bg-white/20"
          >
            ← Back to Home
          </a>
        </div>

        {/* Connection Status */}
        <div className="mb-6 rounded-lg border border-white/20 bg-white/10 p-4 backdrop-blur-sm">
          <h2 className="mb-2 text-lg font-semibold text-white">
            Connection Status
          </h2>
          <p className="text-sm text-gray-200">Status: {connectionStatus}</p>
        </div>

        {/* Latest Message Display */}
        <div className="mb-6 rounded-lg border border-white/20 bg-white/10 p-4 backdrop-blur-sm">
          <h2 className="mb-2 text-lg font-semibold text-white">
            Latest SSE Message
          </h2>
          <p className="rounded border border-white/30 bg-white/20 p-2 font-mono text-sm text-gray-100 backdrop-blur-sm">
            {latestMessage}
          </p>
        </div>

        {/* Connection Controls */}
        <div className="mb-6">
          <h2 className="mb-2 text-lg font-semibold text-white">
            Connection Controls
          </h2>
          <div className="flex gap-2">
            <button
              onClick={connectToSSE}
              disabled={connectionStatus === "Connected"}
              className="rounded-md bg-green-600 px-4 py-2 text-white transition-colors hover:bg-green-700 disabled:opacity-50"
            >
              Connect to SSE
            </button>
            <button
              onClick={disconnectFromSSE}
              disabled={connectionStatus !== "Connected"}
              className="rounded-md bg-red-600 px-4 py-2 text-white transition-colors hover:bg-red-700 disabled:opacity-50"
            >
              Disconnect
            </button>
          </div>
        </div>

        {/* Event Sending Controls */}
        <div className="mb-6">
          <h2 className="mb-2 text-lg font-semibold text-white">
            Send Test Events
          </h2>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={sendTestEvent}
              className="rounded-md border border-white/30 bg-white/10 px-4 py-2 text-white backdrop-blur-sm transition-colors hover:bg-white/20"
            >
              Send Test Event
            </button>
            <button
              onClick={sendUploadProgress}
              className="rounded-md border border-white/30 bg-white/10 px-4 py-2 text-white backdrop-blur-sm transition-colors hover:bg-white/20"
            >
              Send Upload Progress
            </button>
            <button
              onClick={sendUploadComplete}
              className="rounded-md border border-white/30 bg-white/10 px-4 py-2 text-white backdrop-blur-sm transition-colors hover:bg-white/20"
            >
              Send Upload Complete
            </button>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-8 rounded-lg border border-white/20 bg-white/10 p-4 backdrop-blur-sm">
          <h3 className="mb-2 font-semibold text-white">How to Test:</h3>
          <ol className="space-y-1 text-sm text-gray-200">
            <li>1. Click &quot;Connect to SSE&quot; to establish connection</li>
            <li>2. Use the buttons above to send test events</li>
            <li>
              3. Watch the &quot;Latest SSE Message&quot; for real-time updates
            </li>
            <li>4. Check browser network tab to see SSE stream</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
