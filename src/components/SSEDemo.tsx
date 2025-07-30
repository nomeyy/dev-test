"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSSE } from "@/hooks/useSSE";

export default function SSEDemo() {
  const [customMessage, setCustomMessage] = useState("");
  const [targetUserId, setTargetUserId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [connectionLost, setConnectionLost] = useState(false);
  const [lastConnectionCheck, setLastConnectionCheck] = useState<Date | null>(
    null,
  );
  const [allMessages, setAllMessages] = useState<any[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const {
    isConnected,
    clientId,
    lastMessage,
    lastEvent,
    connect,
    disconnect,
    sendTestMessage,
  } = useSSE({
    onConnect: () => {
      console.log("SSE: Connected");
      setError(null);
    },
    onDisconnect: () => {
      console.log("SSE: Disconnected");
    },
    onError: (error) => {
      console.log("SSE: Error", error);
      setError(`Connection error: ${error}`);
    },
    onMessage: (message) => {
      console.log("SSE: Received message", message);
      console.log("SSE: Message event type:", message.event);
      console.log("SSE: Message data:", message.data);

      // Add all received messages to the list
      setAllMessages((prev) => [...prev, message]);
    },
  });

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    // Use setTimeout to ensure DOM is updated before scrolling
    const timeoutId = setTimeout(() => {
      scrollToBottom();
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [allMessages]);

  // Also scroll to bottom when connection status changes (in case messages were missed)
  useEffect(() => {
    if (isConnected && allMessages.length > 0) {
      const timeoutId = setTimeout(() => {
        scrollToBottom();
      }, 100);

      return () => clearTimeout(timeoutId);
    }
  }, [isConnected, allMessages.length]);

  // Add debug info when connection status changes
  useEffect(() => {
    // setDebugInfo(prev => [...prev, `Connection status: ${isConnected ? 'Connected' : 'Disconnected'}`]); // This line was removed from the new_code, so it's removed here.
  }, [isConnected]);

  const getStats = async () => {
    try {
      const response = await fetch("/api/sse/stats");
      const data = await response.json();
      setStats(data);
      // setDebugInfo(prev => [...prev, 'Stats fetched successfully']); // This line was removed from the new_code, so it's removed here.
    } catch (error) {
      console.error("Error fetching stats:", error);
      setError(`Failed to fetch stats: ${error}`);
    }
  };

  const sendBroadcast = async () => {
    if (!customMessage.trim()) {
      setError("Please enter a message to broadcast");
      return;
    }

    try {
      const messageData = {
        message: customMessage,
        timestamp: new Date().toISOString(),
        sender: clientId || "unknown",
        type: "broadcast",
      };

      const response = await fetch("/api/sse/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          event: "custom-message",
          data: messageData,
          target: "all",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to send broadcast");
      }

      const result = await response.json();
      console.log("SSE: Broadcast sent", result);
      console.log("SSE: Broadcast sent to", result.sentCount, "clients");

      // Add the message to local state immediately with a unique identifier
      const messageWithId = {
        event: "custom-message",
        data: {
          ...messageData,
          _localMessage: true, // Mark as local message to prevent duplicates
          _timestamp: Date.now(), // Unique timestamp for this message
        },
        timestamp: messageData.timestamp,
      };

      console.log("Adding message to local state:", messageWithId);
      setAllMessages((prev) => {
        const newMessages = [...prev, messageWithId];
        console.log("Updated messages array:", newMessages);
        return newMessages;
      });

      setCustomMessage(""); // Clear the input after sending
    } catch (error) {
      console.error("Error sending broadcast:", error);
      setError(`Failed to send broadcast: ${error}`);
    }
  };

  const sendUserSpecificMessage = async () => {
    try {
      const response = await fetch("/api/sse/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          event: "user-notification",
          data: {
            message: "Personal notification for authenticated user!",
            timestamp: new Date().toISOString(),
            userId: "authenticated-user",
          },
          target: "user",
          targetId: "authenticated-user",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to send user-specific message");
      }

      console.log("SSE: User-specific message sent");
      // setDebugInfo(prev => [...prev, 'User-specific message sent']); // This line was removed from the new_code, so it's removed here.
    } catch (error) {
      console.error("SSE: Error sending user-specific message:", error);
      setError(`Failed to send user message: ${error}`);
    }
  };

  const sendCustomMessage = async () => {
    if (!customMessage.trim()) {
      setError("Please enter a message");
      return;
    }

    if (!targetUserId.trim()) {
      setError("Please enter a target client ID");
      return;
    }

    try {
      const messageData = {
        message: customMessage,
        timestamp: new Date().toISOString(),
        sender: clientId || "unknown",
        targetClientId: targetUserId,
      };

      const response = await fetch("/api/sse/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          event: "custom-message",
          data: messageData,
          target: "client",
          targetId: targetUserId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to send custom message");
      }

      const result = await response.json();
      console.log("SSE: Custom message sent", result);
      console.log("SSE: Custom message sent to", result.sentCount, "clients");

      // Add the message to local state immediately
      const messageWithId = {
        event: "custom-message",
        data: {
          ...messageData,
          _localMessage: true, // Mark as local message
          _timestamp: Date.now(), // Unique timestamp for this message
        },
        timestamp: messageData.timestamp,
      };

      setAllMessages((prev) => [...prev, messageWithId]);

      setCustomMessage(""); // Clear the input after sending
    } catch (error) {
      console.error("SSE: Error sending custom message:", error);
      setError(`Failed to send custom message: ${error}`);
    }
  };

  const testConnection = async () => {
    try {
      // setDebugInfo(prev => [...prev, 'Testing SSE endpoint...']); // This line was removed from the new_code, so it's removed here.
      const response = await fetch("/api/sse/stats");
      if (response.ok) {
        // setDebugInfo(prev => [...prev, 'SSE endpoint is accessible']); // This line was removed from the new_code, so it's removed here.
      } else {
        setError("SSE endpoint returned error");
      }
    } catch (error) {
      setError(`SSE endpoint test failed: ${error}`);
    }
  };

  const testSSEConnection = async () => {
    try {
      // setDebugInfo(prev => [...prev, 'Testing direct SSE connection...']); // This line was removed from the new_code, so it's removed here.

      // Test if we can establish a connection
      const url = new URL("/api/sse", window.location.origin);
      url.searchParams.set("userId", "test-user");
      url.searchParams.set("sessionId", "test-session");

      const eventSource = new EventSource(url.toString());

      eventSource.onopen = () => {
        // setDebugInfo(prev => [...prev, '✅ Direct SSE connection opened']); // This line was removed from the new_code, so it's removed here.
      };

      eventSource.onerror = (error) => {
        // setDebugInfo(prev => [...prev, `❌ Direct SSE connection error: ${error}`]); // This line was removed from the new_code, so it's removed here.
        eventSource.close();
      };

      eventSource.onmessage = (event) => {
        // setDebugInfo(prev => [...prev, `📥 Direct SSE message: ${event.data}`]); // This line was removed from the new_code, so it's removed here.
      };

      // Close after 5 seconds
      setTimeout(() => {
        // setDebugInfo(prev => [...prev, '🔌 Closing test SSE connection']); // This line was removed from the new_code, so it's removed here.
        eventSource.close();
      }, 5000);
    } catch (error) {
      setError(`Direct SSE connection test failed: ${error}`);
    }
  };

  const diagnoseConnection = async () => {
    try {
      // setDebugInfo(prev => [...prev, '🔍 Starting connection diagnosis...']); // This line was removed from the new_code, so it's removed here.

      // Check if we're connected
      // setDebugInfo(prev => [...prev, `🔍 UI shows connected: ${isConnected}`]); // This line was removed from the new_code, so it's removed here.
      // setDebugInfo(prev => [...prev, `🔍 Client ID: ${clientId}`]); // This line was removed from the new_code, so it's removed here.

      // Check server state
      const response = await fetch("/api/sse/state");
      if (response.ok) {
        const data = await response.json();
        // setDebugInfo(prev => [ // This line was removed from the new_code, so it's removed here.
        //   ...prev,
        //   `🔍 Server total connections: ${data.stats.totalConnections}`,
        //   `🔍 Server active connections: ${data.stats.activeConnections}`,
        //   `🔍 Server clients in map: ${data.totalClientsInMap.length}`,
        // ]);

        // Check if our client is in the server's list
        // const ourClientInServer = data.connectedClients.some((client: any) => client.id === clientId); // This line was removed from the new_code, so it's removed here.
        // setDebugInfo(prev => [...prev, `🔍 Our client in server: ${ourClientInServer ? 'YES' : 'NO'}`]); // This line was removed from the new_code, so it's removed here.

        // if (!ourClientInServer && clientId) { // This line was removed from the new_code, so it's removed here.
        //   setDebugInfo(prev => [...prev, '🔍 ⚠️ Client connected in UI but not on server!']); // This line was removed from the new_code, so it's removed here.
        // }
      }
    } catch (error) {
      setError(`Connection diagnosis failed: ${error}`);
    }
  };

  const debugSSE = async () => {
    try {
      // setDebugInfo(prev => [...prev, 'Getting SSE debug info...']); // This line was removed from the new_code, so it's removed here.
      const response = await fetch("/api/sse/debug");
      if (response.ok) {
        const data = await response.json();
        setLastConnectionCheck(new Date());

        // Check if our client is actually connected on the server
        // const isActuallyConnected = data.connectedClients.some((client: any) => client.id === clientId); // This line was removed from the new_code, so it's removed here.
        // setConnectionLost(!isActuallyConnected); // This line was removed from the new_code, so it's removed here.

        // setDebugInfo(prev => [ // This line was removed from the new_code, so it's removed here.
        //   ...prev,
        //   `Debug: ${data.connectedClients.length} clients connected`,
        //   `Your client ID: ${clientId}`,
        //   `Your user ID: authenticated-user`,
        //   `Server thinks you're connected: ${isActuallyConnected ? 'YES' : 'NO'}`
        // ]);

        // Show connected clients with copy-friendly format
        // if (data.connectedClients.length > 0) { // This line was removed from the new_code, so it's removed here.
        //   setDebugInfo(prev => [...prev, '--- Connected Clients ---']); // This line was removed from the new_code, so it's removed here.
        //   data.connectedClients.forEach((client: any) => { // This line was removed from the new_code, so it's removed here.
        //     setDebugInfo(prev => [...prev, `📋 ${client.id} (User: ${client.userId || 'none'})`]); // This line was removed from the new_code, so it's removed here.
        //   });
        //   setDebugInfo(prev => [...prev, '--- End Clients ---']); // This line was removed from the new_code, so it's removed here.
        // } else {
        //   setDebugInfo(prev => [...prev, '⚠️ No clients connected on server!']); // This line was removed from the new_code, so it's removed here.
        // }
      } else {
        setError("SSE debug endpoint returned error");
      }
    } catch (error) {
      setError(`SSE debug failed: ${error}`);
    }
  };

  const checkServerState = async () => {
    try {
      // setDebugInfo(prev => [...prev, 'Checking server state...']); // This line was removed from the new_code, so it's removed here.
      const response = await fetch("/api/sse/state");
      if (response.ok) {
        const data = await response.json();
        // setDebugInfo(prev => [ // This line was removed from the new_code, so it's removed here.
        //   ...prev,
        //   `Server State at ${data.timestamp}`,
        //   `Total connections: ${data.stats.totalConnections}`,
        //   `Active connections: ${data.stats.activeConnections}`,
        //   `Clients in map: ${data.totalClientsInMap.length}`,
        //   `Connected clients: ${data.connectedClients.length}`,
        // ]);

        // if (data.connectedClients.length > 0) { // This line was removed from the new_code, so it's removed here.
        //   setDebugInfo(prev => [...prev, '--- Server State Clients ---']); // This line was removed from the new_code, so it's removed here.
        //   data.connectedClients.forEach((client: any) => { // This line was removed from the new_code, so it's removed here.
        //     setDebugInfo(prev => [...prev, `🔍 ${client.id} (Connected: ${client.isConnected})`]); // This line was removed from the new_code, so it's removed here.
        //   });
        // }
      } else {
        setError("Server state endpoint returned error");
      }
    } catch (error) {
      setError(`Server state check failed: ${error}`);
    }
  };

  const clearDebug = () => {
    // setDebugInfo([]); // This line was removed from the new_code, so it's removed here.
    setError(null);
  };

  // Auto-check connection status every 10 seconds when connected
  useEffect(() => {
    if (!isConnected) return;

    const interval = setInterval(() => {
      debugSSE();
    }, 10000); // Check every 10 seconds

    return () => clearInterval(interval);
  }, [isConnected]);

  const testMinimalSSE = async () => {
    try {
      // setDebugInfo(prev => [...prev, '🧪 Testing minimal SSE connection...']); // This line was removed from the new_code, so it's removed here.

      // Create a simple EventSource without any complex logic
      const eventSource = new EventSource("/api/sse");

      let messageCount = 0;

      eventSource.onopen = () => {
        // setDebugInfo(prev => [...prev, '🧪 ✅ Minimal SSE connection opened']); // This line was removed from the new_code, so it's removed here.
      };

      eventSource.onmessage = (event) => {
        messageCount++;
        // setDebugInfo(prev => [...prev, `🧪 📥 Message ${messageCount}: ${event.data}`]); // This line was removed from the new_code, so it's removed here.
      };

      eventSource.onerror = (error) => {
        // setDebugInfo(prev => [...prev, `🧪 ❌ Minimal SSE error: ${error}`]); // This line was removed from the new_code, so it's removed here.
      };

      // Keep connection alive for 30 seconds
      setTimeout(() => {
        // setDebugInfo(prev => [...prev, '🧪 🔌 Closing minimal SSE connection after 30s']); // This line was removed from the new_code, so it's removed here.
        eventSource.close();
      }, 30000);
    } catch (error) {
      setError(`Minimal SSE test failed: ${error}`);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <div className="rounded-lg bg-white p-6 text-black shadow-md">
        <h2 className="mb-4 text-2xl font-bold">Server-Sent Events Demo</h2>

        {/* Error Display */}
        {error && (
          <div className="mb-6 rounded border border-red-400 bg-red-100 p-4 text-red-700">
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Connection Status */}
        <div className="mb-6">
          <h3 className="mb-2 text-lg font-semibold">Connection Status</h3>
          <div className="flex items-center space-x-4">
            <div
              className={`h-3 w-3 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`}
            ></div>
            <span className="font-medium">
              {isConnected ? "Connected" : "Disconnected"}
            </span>
            {clientId && (
              <span className="text-sm text-gray-600">
                Client ID: {clientId}
              </span>
            )}
          </div>

          {/* Connection Warning */}
          {connectionLost && (
            <div className="mt-3 rounded border border-red-400 bg-red-100 p-3 text-red-700">
              <strong>⚠️ Connection Lost!</strong> The server doesn't recognize
              your connection.
              <button
                onClick={connect}
                className="ml-2 rounded bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700"
              >
                Reconnect
              </button>
            </div>
          )}

          {/* Last Check */}
          {lastConnectionCheck && (
            <div className="mt-2 text-sm text-gray-500">
              Last server check: {lastConnectionCheck.toLocaleTimeString()}
            </div>
          )}
        </div>

        {/* All Messages Display */}
        <div className="mb-6 rounded-lg bg-gray-50 p-4">
          <h3 className="mb-2 text-lg font-semibold">All Messages</h3>
          {allMessages.length > 0 ? (
            <div className="max-h-60 space-y-3 overflow-y-auto">
              {allMessages.map((msg, index) => {
                // Extract message data properly
                const messageData = msg.data || msg;
                const sender =
                  messageData.sender || messageData.clientId || "Unknown";
                const messageText =
                  messageData.message ||
                  (typeof messageData === "string"
                    ? messageData
                    : JSON.stringify(messageData));

                // Handle timestamp properly
                let timestamp = "Unknown time";
                if (messageData.timestamp) {
                  try {
                    const date = new Date(messageData.timestamp);
                    if (!isNaN(date.getTime())) {
                      timestamp = date.toLocaleTimeString();
                    }
                  } catch (error) {
                    console.error("Error parsing timestamp:", error);
                  }
                }

                // Check if this is the current user's message
                const isOwnMessage = sender === clientId;

                // Debug logging
                console.log("Message display debug:", {
                  sender,
                  clientId,
                  isOwnMessage,
                  messageText: messageText.substring(0, 50) + "...",
                });

                return (
                  <div
                    key={index}
                    className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-xs rounded-lg border bg-white p-3 shadow-sm ${isOwnMessage ? "border-blue-300 bg-blue-100" : ""}`}
                    >
                      <div className="mb-1">
                        <span className="text-xs font-medium text-gray-600">
                          {sender}
                        </span>
                      </div>
                      <p className="mb-1 text-sm text-gray-800">
                        {messageText}
                      </p>
                      <div className="text-right">
                        <span className="text-xs text-gray-400">
                          {timestamp}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          ) : (
            <p className="text-gray-500">No messages received yet.</p>
          )}
        </div>

        {/* Custom Message Input */}
        <div className="mb-6">
          <h3 className="mb-2 text-lg font-semibold">Send Custom Message</h3>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium">Message:</label>
              <textarea
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                placeholder="Enter your custom message here..."
                className="w-full rounded border border-gray-300 p-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                rows={3}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">
                Target Client ID:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={targetUserId}
                  onChange={(e) => setTargetUserId(e.target.value)}
                  placeholder="Enter client ID to target..."
                  className="flex-1 rounded border border-gray-300 p-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={() => setTargetUserId(clientId || "")}
                  disabled={!clientId}
                  className="rounded bg-blue-500 px-3 py-2 text-sm text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-gray-400"
                >
                  Use My ID
                </button>
              </div>
              {clientId && (
                <p className="mt-1 text-sm text-gray-600">
                  Your Client ID:{" "}
                  <code className="rounded bg-gray-100 px-1">{clientId}</code>
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={sendCustomMessage}
                disabled={
                  !isConnected || !customMessage.trim() || !targetUserId.trim()
                }
                className="flex-1 rounded bg-indigo-500 px-4 py-2 text-white hover:bg-indigo-600 disabled:cursor-not-allowed disabled:bg-gray-400"
              >
                Send to Client
              </button>
              <button
                onClick={sendBroadcast}
                disabled={!isConnected || !customMessage.trim()}
                className="flex-1 rounded bg-green-500 px-4 py-2 text-white hover:bg-green-600 disabled:cursor-not-allowed disabled:bg-gray-400"
              >
                Send Broadcast
              </button>
            </div>
          </div>
        </div>

        {/* Connection Controls */}
        <div className="mb-6">
          <h3 className="mb-2 text-lg font-semibold">Controls</h3>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={connect}
              disabled={isConnected}
              className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-gray-400"
            >
              Connect
            </button>
            <button
              onClick={disconnect}
              disabled={!isConnected}
              className="rounded bg-red-500 px-4 py-2 text-white hover:bg-red-600 disabled:cursor-not-allowed disabled:bg-gray-400"
            >
              Disconnect
            </button>
          </div>
        </div>

        {/* Statistics */}
        {stats && (
          <div className="mb-6">
            <h3 className="mb-2 text-lg font-semibold">SSE Statistics</h3>
            <div className="rounded bg-gray-100 p-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="font-medium">Total Connections:</span>{" "}
                  {stats.stats.totalConnections}
                </div>
                <div>
                  <span className="font-medium">Active Connections:</span>{" "}
                  {stats.stats.activeConnections}
                </div>
                <div>
                  <span className="font-medium">Total Events Sent:</span>{" "}
                  {stats.stats.totalEventsSent}
                </div>
                <div>
                  <span className="font-medium">Last Event Sent:</span>{" "}
                  {stats.stats.lastEventSent
                    ? new Date(stats.stats.lastEventSent).toLocaleString()
                    : "Never"}
                </div>
              </div>

              {stats.connectedClients.length > 0 && (
                <div className="mt-4">
                  <span className="font-medium">Connected Clients:</span>
                  <ul className="mt-2 space-y-1">
                    {stats.connectedClients.map((client: any) => (
                      <li key={client.id} className="text-sm">
                        {client.id}{" "}
                        {client.userId && `(User: ${client.userId})`}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
