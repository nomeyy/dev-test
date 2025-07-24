import { useRef, useState, useEffect } from "react";
import { useSSE } from "../../../features/sse/hooks/useSSE";

export type LogEntry =
  | { type: "status"; text: string; timestamp: number }
  | {
      type: "broadcast";
      message: string;
      isTargeted: boolean;
      timestamp: number;
    };

export function useHome() {
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

  return {
    clientId,
    status,
    heartbeat,
    logs,
    messagesEndRef,
    handleDisconnect,
    handleReconnect,
    reset,
  };
}
