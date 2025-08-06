"use client";

import { useSSE } from "@/features/sse";
import { useState } from "react";

export default function SSEDemoPage() {
  // Animation helper for new messages
  const messageRef = (node: HTMLDivElement | null) => {
    if (node) {
      node.style.opacity = "0";
      node.style.transform = "translateY(-10px)";
      requestAnimationFrame(() => {
        node.style.transition = "all 0.3s ease-out";
        node.style.opacity = "1";
        node.style.transform = "translateY(0)";
      });
    }
  };
  const {
    messages,
    isConnected,
    clientId,
    activeClients,
    sendEvent,
    isLoading,
    disconnect,
  } = useSSE();
  const [message, setMessage] = useState("");
  const [targetClientId, setTargetClientId] = useState("");

  const handleSend = async (isBroadcast: boolean) => {
    try {
      await sendEvent(
        "custom_message",
        { text: message },
        isBroadcast ? undefined : targetClientId,
      );
      setMessage("");
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="border-b bg-white">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">
                  SSE demo
                </h1>
                <p className="mt-1 text-sm text-gray-500">
                  Server-Sent Events Monitoring & Control
                </p>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <div className="text-xs text-gray-500">System Time</div>
                  <div className="text-sm font-medium tabular-nums">
                    {new Date().toLocaleTimeString()}
                  </div>
                </div>
                <div className="h-8 w-px bg-gray-200" />
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <div className="text-xs text-gray-500">Protocol</div>
                    <div className="text-sm font-medium">SSE/HTTP2</div>
                  </div>
                  <div className="h-8 w-px bg-gray-200" />
                  <button
                    onClick={disconnect}
                    className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                      isConnected
                        ? "bg-red-100 text-red-700 hover:bg-red-200"
                        : "cursor-not-allowed bg-gray-100 text-gray-400"
                    }`}
                    disabled={!isConnected}
                  >
                    Disconnect
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {/* System Status Overview */}
        <div className="mb-8 rounded-lg border bg-white p-6 shadow-sm">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
            <div className="flex items-center space-x-4">
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-full ${
                  isConnected ? "bg-green-100" : "bg-red-100"
                }`}
              >
                <div
                  className={`h-4 w-4 rounded-full ${
                    isConnected ? "animate-pulse bg-green-500" : "bg-red-500"
                  }`}
                />
              </div>
              <div>
                <div className="text-sm font-medium text-gray-900">
                  {isConnected ? "Connected" : "Disconnected"}
                </div>
                <div className="text-xs text-gray-500">Connection Status</div>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                <span className="font-semibold text-blue-600">
                  {activeClients}
                </span>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-900">
                  Active Clients
                </div>
                <div className="text-xs text-gray-500">Connected Users</div>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100">
                <span className="font-semibold text-purple-600">
                  {messages.length}
                </span>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-900">
                  Total Events
                </div>
                <div className="text-xs text-gray-500">Since Connection</div>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100">
                <span className="font-semibold text-yellow-600">
                  {messages.filter((m) => m.type === "ping").length}
                </span>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-900">
                  Heartbeats
                </div>
                <div className="text-xs text-gray-500">Health Checks</div>
              </div>
            </div>
          </div>

          {clientId && (
            <div className="mt-6 border-t pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    Your Client ID
                  </div>
                  <div className="text-xs text-gray-500">
                    Unique Session Identifier
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <code className="rounded-md bg-gray-100 px-3 py-1 font-mono text-sm">
                    {clientId}
                  </code>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(clientId);
                    }}
                    className="rounded-md p-2 transition-colors hover:bg-gray-100"
                    title="Copy to clipboard"
                  >
                    📋
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="rounded-lg border bg-white shadow-sm">
            <div className="flex items-center justify-between border-b p-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Message Composer
                </h2>
                <p className="mt-0.5 text-sm text-gray-500">
                  Send real-time events to connected clients
                </p>
              </div>
              {isLoading && (
                <div className="flex animate-pulse items-center space-x-2 rounded-full bg-blue-100 px-3 py-1 text-xs text-blue-700">
                  <span className="h-2 w-2 animate-ping rounded-full bg-blue-500" />
                  <span>Sending message...</span>
                </div>
              )}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend(!targetClientId);
              }}
              className="p-4"
            >
              <div className="space-y-4">
                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <label className="block text-sm font-medium text-gray-700">
                      Message Content
                    </label>
                    <div className="text-xs text-gray-500">
                      {message.length} characters
                    </div>
                  </div>
                  <div className="relative">
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      className="h-24 w-full resize-none rounded-lg border bg-gray-50 px-4 py-3 transition-colors focus:border-transparent focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      placeholder="Type your message here..."
                      disabled={isLoading}
                    />
                    {message && (
                      <button
                        type="button"
                        onClick={() => setMessage("")}
                        className="absolute top-2 right-2 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <label className="block text-sm font-medium text-gray-700">
                      Target Client
                    </label>
                    <div className="text-xs text-gray-500">
                      {targetClientId ? "Direct Message" : "Broadcasting"}
                    </div>
                  </div>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <span className="text-gray-500 sm:text-sm">🎯</span>
                    </div>
                    <input
                      type="text"
                      value={targetClientId}
                      onChange={(e) => setTargetClientId(e.target.value)}
                      className="w-full rounded-lg border bg-gray-50 py-2 pr-10 pl-10 font-mono transition-colors focus:border-transparent focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      placeholder="Leave empty to broadcast to all clients"
                      disabled={isLoading}
                    />
                    {targetClientId && (
                      <button
                        type="button"
                        onClick={() => setTargetClientId("")}
                        className="absolute inset-y-0 right-0 flex items-center pr-3"
                      >
                        <span className="cursor-pointer text-gray-400 hover:text-gray-600">
                          ✕
                        </span>
                      </button>
                    )}
                  </div>
                  <p className="mt-1.5 text-xs text-gray-500">
                    {targetClientId
                      ? "Message will be sent to this specific client only"
                      : "Message will be broadcast to all connected clients"}
                  </p>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  {isConnected ? (
                    <span className="flex items-center text-green-600">
                      <span className="mr-2 h-2 w-2 animate-pulse rounded-full bg-green-500" />
                      Ready to send
                    </span>
                  ) : (
                    <span className="flex items-center text-red-600">
                      <span className="mr-2 h-2 w-2 rounded-full bg-red-500" />
                      Disconnected
                    </span>
                  )}
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setMessage("");
                      setTargetClientId("");
                    }}
                    className="px-4 py-2 text-sm text-gray-700 transition-colors hover:text-gray-900"
                  >
                    Clear All
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading || !message || !isConnected}
                    className={`flex items-center space-x-2 rounded-lg px-6 py-2 font-medium transition-all ${
                      targetClientId
                        ? "bg-green-500 text-white hover:bg-green-600 disabled:bg-green-300"
                        : "bg-blue-500 text-white hover:bg-blue-600 disabled:bg-blue-300"
                    } disabled:cursor-not-allowed`}
                  >
                    {isLoading ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        <span>Sending...</span>
                      </>
                    ) : (
                      <>
                        <span>{targetClientId ? "🎯" : "📢"}</span>
                        <span>
                          {targetClientId
                            ? "Send Direct Message"
                            : "Broadcast Message"}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>

          <div className="rounded-lg border bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Messages</h2>
              <div
                className={`rounded px-2 py-1 text-xs transition-colors ${
                  messages.length > 0
                    ? "bg-blue-100 text-blue-700"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {messages.length} event{messages.length !== 1 ? "s" : ""}
              </div>
            </div>
            <div className="custom-scrollbar max-h-[500px] space-y-3 overflow-y-auto pr-2">
              {messages.map((msg, idx) => {
                const isMessage = msg.type === "message";
                const isPing = msg.type === "ping";
                const isConnection = msg.type === "connected";

                return (
                  <div
                    ref={idx === 0 ? messageRef : null}
                    key={idx}
                    className={`relative rounded-lg border p-4 transition-all hover:shadow-md ${
                      isMessage
                        ? "border-blue-100 bg-blue-50"
                        : isPing
                          ? "border-yellow-100 bg-yellow-50"
                          : isConnection
                            ? "border-green-100 bg-green-50"
                            : "border-gray-100 bg-gray-50"
                    }`}
                  >
                    {/* Event Type Badge */}
                    <div className="absolute -top-2 left-4">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          isMessage
                            ? "bg-blue-100 text-blue-800"
                            : isPing
                              ? "bg-yellow-100 text-yellow-800"
                              : isConnection
                                ? "bg-green-100 text-green-800"
                                : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {msg.type}
                      </span>
                    </div>

                    {/* Message Header */}
                    <div className="mt-1 mb-2 flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div
                          className={`h-2 w-2 rounded-full ${
                            isMessage
                              ? "bg-blue-400"
                              : isPing
                                ? "bg-yellow-400"
                                : isConnection
                                  ? "bg-green-400"
                                  : "bg-gray-400"
                          }`}
                        />
                        <span className="text-sm font-medium text-gray-700">
                          Event #{messages.length - idx}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2 text-xs text-gray-500">
                        <span className="tabular-nums">
                          {new Date(msg.timestamp).toLocaleTimeString()}
                        </span>
                        <span className="text-gray-300">•</span>
                        <span className="tabular-nums">
                          {Math.round((Date.now() - msg.timestamp) / 1000)}s ago
                        </span>
                      </div>
                    </div>

                    {/* Message Content */}
                    <div className="text-sm text-gray-600">
                      <div className="space-y-2">
                        <pre className="bg-opacity-50 overflow-x-auto rounded-md bg-white p-3 font-mono text-xs">
                          {JSON.stringify(
                            {
                              type: msg.type,
                              timestamp: new Date(msg.timestamp).toISOString(),
                              data: isMessage
                                ? {
                                    text: msg.data.text,
                                    type: "custom_message",
                                  }
                                : msg.data,
                            },
                            null,
                            2,
                          )}
                        </pre>
                        {isPing && (
                          <div className="flex items-center justify-between pt-2 text-xs text-gray-500">
                            <span>
                              Failed Heartbeats:{" "}
                              {msg.data.failedHeartbeats || 0}
                            </span>
                            {msg.data.timeSinceLastHeartbeat && (
                              <span>
                                Last Beat:{" "}
                                {Math.round(
                                  msg.data.timeSinceLastHeartbeat / 1000,
                                )}
                                s
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Message Footer */}
                    <div className="mt-3 flex items-center justify-end space-x-2">
                      <button
                        onClick={() => {
                          const content = JSON.stringify(
                            {
                              type: msg.type,
                              timestamp: new Date(msg.timestamp).toISOString(),
                              data: isMessage
                                ? {
                                    text: msg.data.text,
                                    type: "custom_message",
                                  }
                                : msg.data,
                            },
                            null,
                            2,
                          );
                          navigator.clipboard.writeText(content);
                        }}
                        className="flex items-center space-x-1 rounded px-2 py-1 text-xs text-gray-500 transition-colors hover:bg-white hover:text-gray-700"
                      >
                        <span>Copy</span>
                        <span>📋</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <style jsx global>{`
            .custom-scrollbar::-webkit-scrollbar {
              width: 6px;
            }
            .custom-scrollbar::-webkit-scrollbar-track {
              background: #f1f1f1;
              border-radius: 3px;
            }
            .custom-scrollbar::-webkit-scrollbar-thumb {
              background: #888;
              border-radius: 3px;
            }
            .custom-scrollbar::-webkit-scrollbar-thumb:hover {
              background: #666;
            }
          `}</style>
        </div>
      </div>
    </main>
  );
}
