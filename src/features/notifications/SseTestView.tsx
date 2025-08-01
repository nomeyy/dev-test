"use client";

import React, { useEffect, useState } from "react";
import { api } from "@/trpc/react";
import { useSSE } from "./useSSE";
import type { Session } from "next-auth";

type Props = {
  session: Session | null;
};

type TargetMode = "single" | "multiple" | "broadcast";

interface ClientEntry {
  userId: string;
  connectionIds: string[];
}

const SseTestView: React.FC<Props> = ({ session }) => {
  const userId = session?.user?.id ?? null;
  const userName = session?.user?.name ?? null;
  const { connected, messages, latest } = useSSE(userId);
  const sendEvent = api.notifications.sendTestEvent.useMutation();

  const [customEvent, setCustomEvent] = React.useState("test.event");
  const [customPayload, setCustomPayload] = React.useState('{"foo":"bar"}');
  const [targetMode, setTargetMode] = React.useState<TargetMode>("single");
  const [selectedUserIds, setSelectedUserIds] = React.useState<string[]>([]);
  const [clients, setClients] = useState<ClientEntry[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);

  const parsePayload = () => {
    try {
      return JSON.parse(customPayload);
    } catch {
      return { raw: customPayload };
    }
  };

  useEffect(() => {
    const fetchClients = async () => {
      setLoadingClients(true);
      try {
        const res = await fetch("/api/sse/clients");
        const json = await res.json();
        const entries: ClientEntry[] = Object.entries(json.clients ?? {}).map(
          ([userId, connectionIds]) => ({
            userId,
            connectionIds: Array.isArray(connectionIds)
              ? (connectionIds as string[])
              : [],
          }),
        );
        setClients(entries);
      } catch (e) {
        console.warn("Failed to load SSE clients", e);
      } finally {
        setLoadingClients(false);
      }
    };
    fetchClients();
    const interval = setInterval(fetchClients, 10_000);
    return () => clearInterval(interval);
  }, []);

  const buildInput = () => {
    const base: any = {
      eventName: customEvent,
      payload: parsePayload(),
    };
    if (targetMode === "single") {
      if (userId) base.targetUserId = userId;
    } else if (targetMode === "multiple") {
      if (selectedUserIds.length) base.targetUserIds = selectedUserIds;
    } else if (targetMode === "broadcast") {
      base.broadcastAll = true;
    }
    return base;
  };

  const handleSend = () => {
    const input = buildInput();
    sendEvent.mutate(input);
  };

  const toggleUserSelection = (id: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(id) ? prev.filter((u) => u !== id) : [...prev, id],
    );
  };

  return (
    <div className="mx-auto max-w-2xl rounded-2xl bg-[#0f111a] p-6 font-sans text-white">
      <h2 className="mb-4 text-2xl font-bold">SSE Test View</h2>

      <div className="mb-4 flex flex-col gap-4">
        <div className="flex flex-wrap items-start gap-4">
          <div className="flex flex-1 flex-wrap gap-2">
            <input
              className="min-w-[120px] flex-1 rounded bg-[#1f2230] p-2 text-sm"
              value={customEvent}
              onChange={(e) => setCustomEvent(e.target.value)}
              placeholder="Event name"
            />
            <input
              className="min-w-[180px] flex-2 rounded bg-[#1f2230] p-2 text-sm"
              value={customPayload}
              onChange={(e) => setCustomPayload(e.target.value)}
              placeholder='{"foo":"bar"}'
            />
          </div>

          <div className="flex items-start gap-4 text-sm">
            <div>
              Target:
              <select
                className="ml-2 rounded bg-[#1f2230] p-1 text-xs"
                value={targetMode}
                onChange={(e) => setTargetMode(e.target.value as TargetMode)}
              >
                <option value="single">Single (me)</option>
                <option value="multiple">Multiple</option>
                <option value="broadcast">Broadcast All</option>
              </select>
            </div>

            {targetMode === "multiple" && (
              <div className="flex max-w-xs flex-col gap-2">
                <div className="mb-1 text-xs">Connected clients:</div>
                {loadingClients ? (
                  <div className="text-xs">Loading...</div>
                ) : (
                  <div className="flex max-h-36 flex-col gap-1 overflow-auto">
                    {clients.map((c) => (
                      <label
                        key={c.userId}
                        className="flex items-center gap-2 rounded bg-[#1f2230] p-1 text-[11px]"
                      >
                        <input
                          type="checkbox"
                          checked={selectedUserIds.includes(c.userId)}
                          onChange={() => toggleUserSelection(c.userId)}
                          className="mr-1"
                        />
                        <div className="break-all">
                          {c.userId} ({c.connectionIds.length})
                        </div>
                      </label>
                    ))}
                    {clients.length === 0 && (
                      <div className="text-[11px] text-gray-400">
                        No connected clients
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <button
              className="self-end rounded bg-green-600 px-4 text-sm text-white"
              onClick={handleSend}
              disabled={
                (!userId && targetMode === "single") || sendEvent.isPending
              }
            >
              Send
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-6">
          <div className="text-sm">
            <div>
              Connection:{" "}
              <span className="font-mono">
                {connected ? "✅ connected" : "⏳ connecting"}
              </span>
            </div>
            <div>
              User:{" "}
              <span className="font-mono">{userName ?? "unauthenticated"}</span>
            </div>
          </div>
          <div className="text-sm">
            <div>Mode: {targetMode}</div>
            {targetMode === "multiple" && (
              <div className="break-all">
                Recipients:{" "}
                {selectedUserIds.length ? selectedUserIds.join(",") : "<none>"}
              </div>
            )}
          </div>
        </div>
      </div>

      {sendEvent.error && (
        <div className="mb-2 text-xs text-red-400">
          Error: {String((sendEvent.error as any)?.message ?? sendEvent.error)}
        </div>
      )}
      {sendEvent.isSuccess && (
        <div className="mb-2 text-xs text-green-400">
          Sent successfully at {new Date().toLocaleTimeString()}
        </div>
      )}

      <div className="mb-6">
        <div className="mb-1 text-sm font-semibold">Latest Event:</div>
        <div className="min-h-[80px] rounded-md bg-[#111] p-3">
          {latest ? (
            <div className="text-sm break-words">
              <div>
                <strong>{latest.event}</strong>
              </div>
              <div className="mt-1">
                <code className="text-xs">{JSON.stringify(latest.data)}</code>
              </div>
              <div className="mt-1 text-[10px] text-gray-400">
                {new Date(latest.receivedAt).toLocaleTimeString()}
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-400">No messages yet.</div>
          )}
        </div>
      </div>

      <div>
        <div className="mb-1 text-sm font-semibold">All received:</div>
        <pre
          className="overflow-auto rounded-md border border-gray-700 bg-[#0f111a] p-3 text-xs"
          style={{ maxHeight: 220 }}
        >
          {JSON.stringify(messages, null, 2)}
        </pre>
      </div>
    </div>
  );
};

export default SseTestView;
