"use client";
import { useRef, useState, useEffect } from "react";
import { useSSE } from "../../../features/sse/hooks/useSSE";

type LogEntry =
  | { type: "status"; text: string; timestamp: number }
  | {
      type: "broadcast";
      message: string;
      isTargeted: boolean;
      timestamp: number;
    };

export default function HomePage() {
  const [reconnectKey, setReconnectKey] = useState(0);
  const [manuallyDisconnected, setManuallyDisconnected] = useState(false);
  const { events, status, clientId, reset } = useSSE(
    "/api/sse",
    reconnectKey,
    manuallyDisconnected,
  );
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [heartbeat, setHeartbeat] = useState(0);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const hasConnectedLog = useRef(false);

  // Pulse the heartbeat dot on every ping
  useEffect(() => {
    const lastPingEvent = [...events].reverse().find((e) => e.event === "ping");
    if (lastPingEvent) {
      setHeartbeat((h) => h + 1);
    }
  }, [events]);

  // Add log for connect/disconnect events and ping
  useEffect(() => {
    if (!clientId) return;
    // Add 'You are connected' log on 'connected' or first 'ping' event
    const lastConnect = [...events]
      .reverse()
      .find((e) => e.event === "connected");
    const lastPing = [...events].reverse().find((e) => e.event === "ping");
    if (
      (lastConnect || lastPing) &&
      status === "connected" &&
      !hasConnectedLog.current
    ) {
      setLogs((prev) => [
        { type: "status", text: "You are connected", timestamp: Date.now() },
        ...prev,
      ]);
      hasConnectedLog.current = true;
    }
    const lastDisconnect = [...events]
      .reverse()
      .find((e) => e.event === "client-disconnect");
    if (
      lastDisconnect &&
      typeof lastDisconnect.data === "object" &&
      lastDisconnect.data !== null &&
      "id" in lastDisconnect.data &&
      (lastDisconnect.data as { id: string }).id === clientId
    ) {
      setLogs((prev) => [
        { type: "status", text: "You are disconnected", timestamp: Date.now() },
        ...prev,
      ]);
      hasConnectedLog.current = false;
    }
  }, [events, clientId, status]);

  // Add log for broadcast messages
  useEffect(() => {
    if (!clientId) return;
    const newBroadcasts = [...events]
      .filter((e) => {
        const data =
          typeof e.data === "object" && e.data !== null
            ? (e.data as { clientId?: string })
            : {};
        return (
          e.event === "broadcast" &&
          (!data.clientId || data.clientId === clientId)
        );
      })
      .map((e) => {
        const data =
          typeof e.data === "object" && e.data !== null
            ? (e.data as { message?: string; clientId?: string })
            : {};
        return {
          type: "broadcast" as const,
          message: data.message ?? "",
          isTargeted: !!data.clientId,
          timestamp: Date.now(),
        };
      });
    // Only add new broadcasts not already in logs
    setLogs((prev) => {
      const existing = new Set(
        prev
          .filter((l) => l.type === "broadcast")
          .map((l) => (l.type === "broadcast" ? l.message : "")),
      );
      const toAdd = newBroadcasts.filter((b) => !existing.has(b.message));
      return [...toAdd, ...prev];
    });
  }, [events, clientId]);

  const handleDisconnect = () => {
    setLogs((prev) => [
      { type: "status", text: "You are disconnected", timestamp: Date.now() },
      ...prev,
    ]);
    hasConnectedLog.current = false;
    setManuallyDisconnected(true);
  };
  const handleReconnect = () => {
    setManuallyDisconnected(false);
    setReconnectKey((k) => k + 1);
    setLogs((prev) => [
      { type: "status", text: "You are connected", timestamp: Date.now() },
      ...prev,
    ]);
    hasConnectedLog.current = true;
  };

  return (
    <div
      style={{
        maxWidth: 600,
        margin: "40px auto",
        padding: 32,
        background: "#181c2a",
        borderRadius: 12,
        color: "#fff",
        boxShadow: "0 2px 16px #0002",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", marginBottom: 24 }}>
        <span style={{ fontWeight: 600, fontSize: 18 }}>Client ID:</span>
        <span
          style={{
            marginLeft: 12,
            background: "#222",
            padding: "4px 10px",
            borderRadius: 4,
            fontSize: 15,
          }}
        >
          {clientId ?? "..."}
        </span>
        <span style={{ marginLeft: 24, fontWeight: 600 }}>Status:</span>
        <span
          style={{
            marginLeft: 8,
            color: status === "connected" ? "lightgreen" : "red",
            fontWeight: 600,
          }}
        >
          {status}
        </span>
        {/* Heartbeat indicator */}
        <span
          style={{
            marginLeft: 24,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <span
            key={heartbeat}
            style={{
              display: "inline-block",
              width: 14,
              height: 14,
              borderRadius: "50%",
              background: "#4f8cff",
              boxShadow: "0 0 8px #4f8cff",
              animation: "heartbeat 0.5s cubic-bezier(.4,1.6,.6,1) 1",
            }}
          />
          <style>{`
            @keyframes heartbeat {
              0% { transform: scale(1); }
              30% { transform: scale(1.5); }
              60% { transform: scale(0.9); }
              100% { transform: scale(1); }
            }
          `}</style>
        </span>
        {status === "connected" && (
          <button
            onClick={handleDisconnect}
            style={{
              marginLeft: 16,
              padding: "4px 12px",
              borderRadius: 4,
              background: "#ff4d4d",
              color: "#fff",
              border: "none",
              fontWeight: 600,
            }}
          >
            Disconnect
          </button>
        )}
        {status === "disconnected" && (
          <button
            onClick={handleReconnect}
            style={{
              marginLeft: 16,
              padding: "4px 12px",
              borderRadius: 4,
              background: "#4f8cff",
              color: "#fff",
              border: "none",
              fontWeight: 600,
            }}
          >
            Reconnect
          </button>
        )}
      </div>
      <div
        style={{
          maxHeight: 260,
          overflowY: "auto",
          background: "#222",
          borderRadius: 6,
          padding: 12,
          marginBottom: 16,
        }}
      >
        <strong>Messages:</strong>
        {logs.length === 0 ? (
          <div style={{ color: "#aaa", marginTop: 8 }}>No messages yet</div>
        ) : (
          <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
            {logs.map((log, i) =>
              log.type === "status" ? (
                <li
                  key={i}
                  style={{ marginBottom: 8, color: "#ffd700", fontWeight: 600 }}
                >
                  {log.text}
                </li>
              ) : (
                <li
                  key={i}
                  style={{
                    marginBottom: 12,
                    background: log.isTargeted ? "#2d1a4d" : "#1a2d1a",
                    borderRadius: 6,
                    padding: "10px 16px",
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <span
                    style={{
                      fontWeight: 700,
                      color: log.isTargeted ? "#b266ff" : "#4f8cff",
                      fontSize: 15,
                      marginRight: 8,
                    }}
                  >
                    {log.isTargeted ? "🟣 Direct to you:" : "🟢 Broadcast:"}
                  </span>
                  <span style={{ fontSize: 15 }}>{log.message}</span>
                </li>
              ),
            )}
            <div ref={messagesEndRef} />
          </ul>
        )}
      </div>
      <button
        onClick={reset}
        style={{
          marginTop: 8,
          padding: "6px 16px",
          borderRadius: 4,
          background: "#333",
          color: "#fff",
          border: "none",
          fontWeight: 600,
        }}
      >
        Clear Messages
      </button>
    </div>
  );
}
