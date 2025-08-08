"use client";

import React, { useState, useEffect, useCallback } from "react";

function SSEDemoPage() {
  const [eventSource, setEventSource] = useState<EventSource | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<
    Array<{ type: string; content: string; time: string }>
  >([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, []);

  const addMessage = useCallback((type: string, content: string) => {
    const time = new Date().toLocaleTimeString();
    setMessages((prev) => [...prev, { type, content, time }]);
  }, []);

  const connect = useCallback(() => {
    if (eventSource) {
      eventSource.close();
    }

    const es = new EventSource("/api/sse");

    es.onopen = () => {
      setIsConnected(true);
      addMessage("system", "Connected to SSE endpoint");
    };

    es.onerror = () => {
      setIsConnected(false);
      addMessage("error", "Connection error occurred");
    };

    es.addEventListener("connected", (event) => {
      const data = JSON.parse(event.data);
      addMessage("connected", `Client ID: ${data.clientId}`);
    });

    es.addEventListener("heartbeat", (event) => {
      const data = JSON.parse(event.data);
      addMessage("heartbeat", `Heartbeat received at ${data.timestamp}`);
    });

    es.addEventListener("test", (event) => {
      const data = JSON.parse(event.data);
      addMessage("test", `Message: ${data.message}\nFrom: ${data.sender}`);
    });

    es.addEventListener("broadcast", (event) => {
      const data = JSON.parse(event.data);
      addMessage("broadcast", `Broadcast: ${data.message}`);
    });

    es.addEventListener("system.update", (event) => {
      const data = JSON.parse(event.data);
      addMessage("system", `System Update: ${data.message}`);
    });

    setEventSource(es);
  }, [eventSource, addMessage]);

  const disconnect = useCallback(() => {
    if (eventSource) {
      eventSource.close();
      setEventSource(null);
      setIsConnected(false);
      addMessage("system", "Disconnected from SSE");
    }
  }, [eventSource, addMessage]);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  const sendTestMessage = async () => {
    try {
      const response = await fetch("/api/sse/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "test",
          message: `Test message #${Math.floor(Math.random() * 1000)}`,
        }),
      });
      const data = await response.json();
      console.log("Test message sent:", data);
    } catch (error) {
      console.error("Error sending test message:", error);
      addMessage("error", "Failed to send test message");
    }
  };

  const sendBroadcast = async () => {
    try {
      const response = await fetch("/api/sse/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "broadcast",
          message: `Broadcast message at ${new Date().toLocaleTimeString()}`,
        }),
      });
      const data = await response.json();
      console.log("Broadcast sent:", data);
    } catch (error) {
      console.error("Error sending broadcast:", error);
      addMessage("error", "Failed to send broadcast");
    }
  };

  const sendSystemUpdate = async () => {
    try {
      const response = await fetch("/api/sse/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "system",
          message: "System maintenance scheduled for midnight",
        }),
      });
      const data = await response.json();
      console.log("System update sent:", data);
    } catch (error) {
      console.error("Error sending system update:", error);
      addMessage("error", "Failed to send system update");
    }
  };

  const getMessageStyle = (type: string) => {
    const baseStyle = {
      padding: "8px",
      margin: "5px 0",
      borderLeft: "3px solid",
      background: "#f8f9fa",
    };

    const colors: Record<string, string> = {
      heartbeat: "#28a745",
      test: "#ffc107",
      broadcast: "#dc3545",
      error: "#6c757d",
      system: "#17a2b8",
      connected: "#007bff",
    };

    return {
      ...baseStyle,
      borderLeftColor: colors[type] || "#007bff",
    };
  };

  if (!mounted) {
    return null;
  }

  return (
    <div
      style={{
        maxWidth: "800px",
        margin: "50px auto",
        padding: "20px",
        background: "#f5f5f5",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <h1 style={{ color: "#333" }}>🚀 Server-Sent Events (SSE) Demo</h1>

      <div
        style={{
          padding: "10px",
          borderRadius: "5px",
          margin: "20px 0",
          fontWeight: "bold",
          background: isConnected ? "#d4edda" : "#f8d7da",
          color: isConnected ? "#155724" : "#721c24",
        }}
      >
        Status: {isConnected ? "Connected" : "Disconnected"}
      </div>

      <div style={{ margin: "20px 0" }}>
        <button
          onClick={connect}
          disabled={isConnected}
          style={{
            padding: "10px 20px",
            margin: "5px",
            border: "none",
            borderRadius: "5px",
            background: isConnected ? "#ccc" : "#007bff",
            color: "white",
            cursor: isConnected ? "not-allowed" : "pointer",
            fontSize: "16px",
          }}
        >
          Connect to SSE
        </button>
        <button
          onClick={disconnect}
          disabled={!isConnected}
          style={{
            padding: "10px 20px",
            margin: "5px",
            border: "none",
            borderRadius: "5px",
            background: !isConnected ? "#ccc" : "#007bff",
            color: "white",
            cursor: !isConnected ? "not-allowed" : "pointer",
            fontSize: "16px",
          }}
        >
          Disconnect
        </button>
        <button
          onClick={clearMessages}
          style={{
            padding: "10px 20px",
            margin: "5px",
            border: "none",
            borderRadius: "5px",
            background: "#007bff",
            color: "white",
            cursor: "pointer",
            fontSize: "16px",
          }}
        >
          Clear Messages
        </button>
      </div>

      <div style={{ margin: "20px 0" }}>
        <h3>Send Test Messages:</h3>
        <button
          onClick={sendTestMessage}
          disabled={!isConnected}
          style={{
            padding: "10px 20px",
            margin: "5px",
            border: "none",
            borderRadius: "5px",
            background: !isConnected ? "#ccc" : "#007bff",
            color: "white",
            cursor: !isConnected ? "not-allowed" : "pointer",
            fontSize: "16px",
          }}
        >
          Send Test Message
        </button>
        <button
          onClick={sendBroadcast}
          disabled={!isConnected}
          style={{
            padding: "10px 20px",
            margin: "5px",
            border: "none",
            borderRadius: "5px",
            background: !isConnected ? "#ccc" : "#007bff",
            color: "white",
            cursor: !isConnected ? "not-allowed" : "pointer",
            fontSize: "16px",
          }}
        >
          Send Broadcast
        </button>
        <button
          onClick={sendSystemUpdate}
          disabled={!isConnected}
          style={{
            padding: "10px 20px",
            margin: "5px",
            border: "none",
            borderRadius: "5px",
            background: !isConnected ? "#ccc" : "#007bff",
            color: "white",
            cursor: !isConnected ? "not-allowed" : "pointer",
            fontSize: "16px",
          }}
        >
          Send System Update
        </button>
      </div>

      <h3>Messages:</h3>
      <div
        style={{
          background: "white",
          border: "1px solid #ddd",
          borderRadius: "5px",
          padding: "15px",
          height: "400px",
          overflowY: "auto",
        }}
      >
        {messages.length === 0 ? (
          <div style={{ color: "#666" }}>
            No messages yet. Click "Connect to SSE" to start.
          </div>
        ) : (
          messages.map((msg, index) => (
            <div key={index} style={getMessageStyle(msg.type)}>
              <div style={{ color: "#666", fontSize: "12px" }}>
                [{msg.time}] {msg.type.toUpperCase()}
              </div>
              <div style={{ marginTop: "5px", whiteSpace: "pre-wrap" }}>
                {msg.content}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default SSEDemoPage;
