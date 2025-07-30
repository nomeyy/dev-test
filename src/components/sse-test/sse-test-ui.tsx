"use client";

import { useState, useRef, useEffect } from "react";
import { useSSE } from "@/lib/sse/use-sse";
import { Button } from "@/shared/components/ui/button";

export function SSETestUI() {
  // Use refs to store stable IDs that don't change on re-renders
  const userIdRef = useRef("test-user-" + Date.now());
  const sessionIdRef = useRef("test-session-" + Date.now());

  const [userId, setUserId] = useState(userIdRef.current);
  const [sessionId, setSessionId] = useState(sessionIdRef.current);
  const [testMessage, setTestMessage] = useState("Hello SSE!");

  const { isConnected, lastEvent, events, error, reconnect, disconnect } =
    useSSE({
      userId: userIdRef.current, // Use the stable ref value
      sessionId: sessionIdRef.current, // Use the stable ref value
      onConnect: () => console.log("SSE connected!"),
      onDisconnect: () => console.log("SSE disconnected!"),
      onMessage: (event) => {
        console.log("SSE message received in UI:", event);
        // Log broadcast messages specifically
        if (event.event === "broadcast_message") {
          console.log("🎉 BROADCAST MESSAGE RECEIVED:", event.data);
        }
      },
    });

  // Debug effect to log when events change
  useEffect(() => {
    console.log("Events updated:", events.length, "total events");
    if (events.length > 0) {
      console.log("Latest event:", events[events.length - 1]);
    }
  }, [events]);

  // Debug effect to log when lastEvent changes
  useEffect(() => {
    if (lastEvent) {
      console.log("Last event updated:", lastEvent);
    }
  }, [lastEvent]);

  const updateIds = () => {
    const newUserId = "test-user-" + Date.now();
    const newSessionId = "test-session-" + Date.now();

    userIdRef.current = newUserId;
    sessionIdRef.current = newSessionId;

    setUserId(newUserId);
    setSessionId(newSessionId);

    // Reconnect with new IDs
    disconnect();
    setTimeout(() => {
      reconnect();
    }, 100);
  };

  const sendTestMessage = async () => {
    try {
      const response = await fetch("/api/sse/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: userIdRef.current, // Use the stable ref value
          message: testMessage,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to send test message");
      }

      console.log("Test message sent successfully");
    } catch (error) {
      console.error("Error sending test message:", error);
    }
  };

  const sendBroadcastMessage = async () => {
    try {
      console.log("Sending broadcast message:", testMessage);
      const response = await fetch("/api/sse/broadcast", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: testMessage,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to send broadcast message");
      }

      const result = await response.json();
      console.log("Broadcast message sent successfully:", result);
    } catch (error) {
      console.error("Error sending broadcast message:", error);
    }
  };

  const getStats = async () => {
    try {
      const response = await fetch("/api/sse/stats");
      if (response.ok) {
        const stats = await response.json();
        console.log("SSE Stats:", stats);
        alert(`SSE Stats: ${JSON.stringify(stats, null, 2)}`);
      }
    } catch (error) {
      console.error("Error getting stats:", error);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-6 shadow-lg backdrop-blur-sm">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">SSE Test Interface</h2>
          <div className="rounded-full bg-blue-900/30 px-3 py-1 text-sm text-blue-300">
            Receives broadcast messages from clients
          </div>
        </div>

        {/* Connection Status */}
        <div className="mb-6 rounded-lg border border-gray-600 bg-gray-700/50 p-4">
          <div className="mb-2 flex items-center gap-2">
            <div
              className={`h-3 w-3 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`}
            />
            <span className="font-medium text-white">
              Status: {isConnected ? "Connected" : "Disconnected"}
            </span>
          </div>
          {error && <div className="mt-2 text-sm text-red-400">{error}</div>}
          <div className="mt-2 text-xs text-gray-400">
            User ID: {userId} | Session ID: {sessionId}
          </div>
        </div>

        {/* Connection Controls */}
        <div className="mb-6 flex gap-2">
          <Button onClick={reconnect} disabled={isConnected}>
            Reconnect
          </Button>
          <Button onClick={disconnect} disabled={!isConnected}>
            Disconnect
          </Button>
          <Button onClick={updateIds}>New IDs</Button>
          <Button onClick={getStats}>Get Stats</Button>
        </div>

        {/* Configuration */}
        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-white">
              User ID
            </label>
            <input
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="w-full rounded-md border border-gray-600 bg-gray-700 px-3 py-2 text-white"
              readOnly
            />
            <p className="mt-1 text-xs text-gray-400">
              Click "New IDs" to generate new IDs
            </p>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-white">
              Session ID
            </label>
            <input
              type="text"
              value={sessionId}
              onChange={(e) => setSessionId(e.target.value)}
              className="w-full rounded-md border border-gray-600 bg-gray-700 px-3 py-2 text-white"
              readOnly
            />
            <p className="mt-1 text-xs text-gray-400">
              Click "New IDs" to generate new IDs
            </p>
          </div>
        </div>

        {/* Test Message Input */}
        <div className="mb-6">
          <label className="mb-1 block text-sm font-medium text-white">
            Test Message
          </label>
          <input
            type="text"
            value={testMessage}
            onChange={(e) => setTestMessage(e.target.value)}
            className="w-full rounded-md border border-gray-600 bg-gray-700 px-3 py-2 text-white"
            placeholder="Enter your test message..."
          />
        </div>

        {/* Test Buttons */}
        <div className="mb-6 flex gap-2">
          <Button onClick={sendTestMessage} disabled={!isConnected}>
            Send to User
          </Button>
          <Button onClick={sendBroadcastMessage} disabled={!isConnected}>
            Broadcast to All
          </Button>
        </div>

        {/* Last Event Display */}
        {lastEvent && (
          <div className="mb-6 rounded-lg border border-blue-700 bg-blue-900/30 p-4">
            <h3 className="mb-2 text-lg font-medium text-white">Last Event</h3>
            <div className="mb-1 text-sm text-blue-200">
              Event: <span className="font-mono">{lastEvent.event}</span>
              {lastEvent.event === "broadcast_message" && (
                <span className="ml-2 text-green-300">🎉 BROADCAST</span>
              )}
            </div>
            <div className="mb-1 text-sm text-blue-200">
              ID: <span className="font-mono">{lastEvent.id || "N/A"}</span>
            </div>
            <pre className="overflow-auto rounded border border-gray-600 bg-gray-800 p-2 text-xs text-gray-200">
              {JSON.stringify(lastEvent.data, null, 2)}
            </pre>
          </div>
        )}

        {/* Event History */}
        <div className="rounded-lg border border-gray-600 bg-gray-700/50 p-4">
          <h3 className="mb-2 text-lg font-medium text-white">
            Event History ({events.length} events)
          </h3>
          <div className="max-h-64 space-y-2 overflow-y-auto">
            {events.length === 0 ? (
              <div className="text-gray-400">No events yet...</div>
            ) : (
              events
                .slice(-5)
                .reverse()
                .map((event, index) => (
                  <div
                    key={index}
                    className="rounded-md border border-gray-600 bg-gray-800 p-3"
                  >
                    <div className="mb-1 flex items-start justify-between">
                      <span className="text-sm font-medium text-white">
                        {event.event}
                        {event.event === "broadcast_message" && (
                          <span className="ml-2 text-green-300">🎉</span>
                        )}
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date().toLocaleTimeString()}
                      </span>
                    </div>
                    <pre className="overflow-auto rounded bg-gray-900 p-2 text-xs text-gray-200">
                      {JSON.stringify(event.data, null, 2)}
                    </pre>
                  </div>
                ))
            )}
          </div>
        </div>

        {/* Testing Guidelines */}
        <div className="mt-6 rounded-lg border border-yellow-700 bg-yellow-900/30 p-4">
          <h3 className="mb-2 text-lg font-medium text-white">
            Testing Guidelines
          </h3>
          <div className="space-y-2 text-sm text-yellow-200">
            <p>
              <strong>1. Connection Test:</strong> Check if status shows
              "Connected" with green dot
            </p>
            <p>
              <strong>2. Message Test:</strong> Type a message and click "Send
              to User" or "Broadcast to All"
            </p>
            <p>
              <strong>3. Event History:</strong> Verify events appear in the
              history section
            </p>
            <p>
              <strong>4. Multiple Users:</strong> Open multiple tabs and click
              "New IDs" in each
            </p>
            <p>
              <strong>5. Console Logs:</strong> Check browser console for
              detailed logs
            </p>
            <p>
              <strong>6. Server Logs:</strong> Monitor terminal for server-side
              logs
            </p>
            <p>
              <strong>7. Broadcast Testing:</strong> This page receives all
              broadcast messages from clients
            </p>
            <p>
              <strong>8. Debug:</strong> Look for 🎉 BROADCAST indicators in the
              UI
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
