"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSSEConnection } from "./hooks/useSSEConnection";
import { useEventLog } from "./hooks/useEventLog";
import { useMessageSender } from "./hooks/useMessageSender";
import { ConnectionStatus } from "./components/ConnectionStatus";
import { LatestEvent } from "./components/LatestEvent";
import { ServerStats } from "./components/ServerStats";
import { HeartbeatStatus } from "./components/HeartbeatStatus";
import { ConnectionControls } from "./components/ConnectionControls";
import { MessageSender } from "./components/MessageSender";
import { EventsLog } from "./components/EventsLog";

export default function SSETestPage() {
  // User inputs
  const [userId, setUserId] = useState("user_123");
  const [sessionId, setSessionId] = useState("session_456");

  // Custom hooks
  const { isConnected, clientId, stats, connect, disconnect } =
    useSSEConnection();
  const { events, lastEvent, addEvent, clearEvents } = useEventLog();
  const {
    sendTarget,
    setSendTarget,
    sendTargetId,
    setSendTargetId,
    sendMessage,
    setSendMessage,
    sendTestMessage,
  } = useMessageSender();

  // Handle connection
  const handleConnect = () => {
    connect(userId, sessionId, addEvent);
  };

  const handleDisconnect = useCallback(() => {
    disconnect(addEvent);
  }, [disconnect, addEvent]);

  const handleSendMessage = () => {
    void sendTestMessage(addEvent);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      handleDisconnect();
    };
  }, [handleDisconnect]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-900 p-4">
      <div className="mx-auto max-w-6xl">
        <div className="rounded-2xl bg-white/10 p-8 text-white shadow-2xl backdrop-blur-lg">
          <h1 className="mb-8 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-center text-4xl font-bold text-transparent">
            SSE Test Dashboard
          </h1>

          {/* Connection Status and Stats */}
          <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-4">
            <ConnectionStatus isConnected={isConnected} clientId={clientId} />
            <LatestEvent lastEvent={lastEvent} />
            <ServerStats stats={stats} />
            <HeartbeatStatus stats={stats} />
          </div>

          {/* Connection Controls */}
          <ConnectionControls
            userId={userId}
            setUserId={setUserId}
            sessionId={sessionId}
            setSessionId={setSessionId}
            isConnected={isConnected}
            onConnect={handleConnect}
            onDisconnect={handleDisconnect}
          />

          {/* Message Sender */}
          <MessageSender
            sendTarget={sendTarget}
            setSendTarget={setSendTarget}
            sendTargetId={sendTargetId}
            setSendTargetId={setSendTargetId}
            sendMessage={sendMessage}
            setSendMessage={setSendMessage}
            onSendMessage={handleSendMessage}
          />

          {/* Events Log */}
          <EventsLog events={events} onClearEvents={clearEvents} />
        </div>
      </div>
    </div>
  );
}
