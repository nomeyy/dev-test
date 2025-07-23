"use client";

import { useState, useEffect, useRef } from "react";
import { createSSEClient } from "../utils/sse-client";
import type { SSEEvent } from "../types";

/**
 * Simple test UI component to demonstrate SSE functionality
 */
export function SSETestUI() {
  const [isConnected, setIsConnected] = useState(false);
  const [latestMessage, setLatestMessage] = useState<string>("No messages yet");
  const [messageHistory, setMessageHistory] = useState<SSEEvent[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<string>("Disconnected");
  const clientRef = useRef<ReturnType<typeof createSSEClient> | null>(null);

  useEffect(() => {
    // Initialize SSE client
    const client = createSSEClient("/api/sse");
    clientRef.current = client;

    // Set up event handlers
    client.on("*", (event) => {
      console.log("SSE Event received:", event);
      setLatestMessage(`${event.type}: ${JSON.stringify(event.data)}`);
      setMessageHistory(prev => [...prev.slice(-9), event]); // Keep last 10 messages
    });

    client.on("system_message", (event) => {
      setConnectionStatus("Connected");
      setIsConnected(true);
    });

    client.on("heartbeat", (event) => {
      // Update connection status with heartbeat
      setConnectionStatus("Connected (Heartbeat received)");
    });

    client.onError((error) => {
      console.error("SSE Error:", error);
      setConnectionStatus("Error");
      setIsConnected(false);
    });

    client.onOpen(() => {
      setConnectionStatus("Connecting...");
    });

    client.onClose(() => {
      setConnectionStatus("Disconnected");
      setIsConnected(false);
    });

    // Connect to SSE
    client.connect().catch(error => {
      console.error("Failed to connect to SSE:", error);
      setConnectionStatus("Connection failed");
    });

    // Cleanup on unmount
    return () => {
      if (clientRef.current) {
        clientRef.current.disconnect();
      }
    };
  }, []);

  const sendTestNotification = async () => {
    try {
      // This would typically be called from your backend
      // For testing, we'll simulate it by making a request to a test endpoint
      const response = await fetch("/api/sse/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "notification",
          title: "Test Notification",
          message: `Test message sent at ${new Date().toLocaleTimeString()}`,
          level: "info",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to send test notification");
      }

      console.log("Test notification sent successfully");
    } catch (error) {
      console.error("Error sending test notification:", error);
      setLatestMessage(`Error: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

  const sendTestUserUpdate = async () => {
    try {
      const response = await fetch("/api/sse/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "user_update",
          field: "status",
          value: `Updated at ${new Date().toLocaleTimeString()}`,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to send test user update");
      }

      console.log("Test user update sent successfully");
    } catch (error) {
      console.error("Error sending test user update:", error);
      setLatestMessage(`Error: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

  const clearMessages = () => {
    setMessageHistory([]);
    setLatestMessage("Messages cleared");
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">SSE Test Interface</h1>
      
      {/* Connection Status */}
      <div className="mb-6 p-4 bg-gray-100 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">Connection Status</h2>
        <div className="flex items-center gap-2">
          <div 
            className={`w-3 h-3 rounded-full ${
              isConnected ? "bg-green-500" : "bg-red-500"
            }`}
          />
          <span className="font-mono">{connectionStatus}</span>
        </div>
      </div>

      {/* Latest Message */}
      <div className="mb-6 p-4 bg-blue-50 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">Latest Message</h2>
        <div className="font-mono text-sm bg-white p-3 rounded border">
          {latestMessage}
        </div>
      </div>

      {/* Test Buttons */}
      <div className="mb-6 flex gap-4">
        <button
          onClick={sendTestNotification}
          disabled={!isConnected}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          Send Test Notification
        </button>
        <button
          onClick={sendTestUserUpdate}
          disabled={!isConnected}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          Send Test User Update
        </button>
        <button
          onClick={clearMessages}
          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
        >
          Clear Messages
        </button>
      </div>

      {/* Message History */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2">Message History (Last 10)</h2>
        <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
          {messageHistory.length === 0 ? (
            <p className="text-gray-500">No messages yet</p>
          ) : (
            <div className="space-y-2">
              {messageHistory.map((event, index) => (
                <div key={index} className="bg-white p-3 rounded border">
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-semibold text-sm text-blue-600">
                      {event.type}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(event.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                    {JSON.stringify(event.data, null, 2)}
                  </pre>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Instructions */}
      <div className="text-sm text-gray-600">
        <h3 className="font-semibold mb-2">How to test:</h3>
        <ol className="list-decimal list-inside space-y-1">
          <li>Wait for the connection to establish (status should show "Connected")</li>
          <li>Click "Send Test Notification" to send a test notification event</li>
          <li>Click "Send Test User Update" to send a test user update event</li>
          <li>Watch the latest message and message history update in real-time</li>
          <li>Heartbeat events will be sent automatically every 30 seconds</li>
        </ol>
      </div>
    </div>
  );
} 