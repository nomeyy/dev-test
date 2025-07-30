import { useEffect, useRef, useState } from "react";
import { useSSE } from "../../../features/sse/hooks/useSSE";
import type { LogEntry } from "@/types/sse";
import { EVENT_TYPES, MESSAGE_TYPES } from "@/utils/constants";

export function useHome() {
  const [reconnectKey, setReconnectKey] = useState(0);
  const [manuallyDisconnected, setManuallyDisconnected] = useState(false);
  const { events, status, clientId } = useSSE(
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
      {
        type: MESSAGE_TYPES.STATUS,
        text: "You are disconnected",
        timestamp: Date.now(),
      },
      ...prev,
    ]);
    hasConnectedLog.current = false;
    setManuallyDisconnected(true);
  };
  const handleReconnect = () => {
    setManuallyDisconnected(false);
    setReconnectKey((k) => k + 1);
    setLogs((prev) => [
      {
        type: MESSAGE_TYPES.STATUS,
        text: "You are connected",
        timestamp: Date.now(),
      },
      ...prev,
    ]);
    hasConnectedLog.current = true;
  };

  // Pulse the heartbeat dot on every ping
  useEffect(() => {
    const lastPingEvent = [...events]
      .reverse()
      .find((e) => e.event === EVENT_TYPES.PING);
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
      .find((e) => e.event === EVENT_TYPES.CONNECTED);
    const lastPing = [...events]
      .reverse()
      .find((e) => e.event === EVENT_TYPES.PING);
    if (
      (lastConnect || lastPing) &&
      status === EVENT_TYPES.CONNECTED &&
      !hasConnectedLog.current
    ) {
      setLogs((prev) => [
        {
          type: MESSAGE_TYPES.STATUS,
          text: "You are connected",
          timestamp: Date.now(),
        },
        ...prev,
      ]);
      hasConnectedLog.current = true;
    }
    const lastDisconnect = [...events]
      .reverse()
      .find((e) => e.event === EVENT_TYPES.CLIENT_DISCONNECT);
    if (
      lastDisconnect &&
      typeof lastDisconnect.data === "object" &&
      lastDisconnect.data !== null &&
      "id" in lastDisconnect.data &&
      (lastDisconnect.data as { id: string }).id === clientId
    ) {
      setLogs((prev) => [
        {
          type: MESSAGE_TYPES.STATUS,
          text: "You are disconnected",
          timestamp: Date.now(),
        },
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
          e.event === EVENT_TYPES.BROADCAST &&
          (!data.clientId || data.clientId === clientId)
        );
      })
      .map((e) => {
        const data =
          typeof e.data === "object" && e.data !== null
            ? (e.data as { message?: string; clientId?: string })
            : {};
        return {
          type: MESSAGE_TYPES.BROADCAST,
          message: data.message ?? "",
          isTargeted: !!data.clientId,
          timestamp: Date.now(),
        };
      });
    // Only add new broadcasts not already in logs
    setLogs((prev) => {
      const existing = new Set(
        prev
          .filter((l) => l.type === MESSAGE_TYPES.BROADCAST)
          .map((l) => (l.type === MESSAGE_TYPES.BROADCAST ? l.message : "")),
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
  };
}
