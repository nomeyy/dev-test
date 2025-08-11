"use client";

import { useEffect, useRef, useState } from "react";

export default function SseTestPage() {
  const [connected, setConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<string>("-");
  const [clientId, setClientId] = useState<string>("");
  const evtRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const cryptoMaybe = (globalThis as unknown as { crypto?: Crypto }).crypto;
    const id: string =
      typeof cryptoMaybe?.randomUUID === "function"
        ? cryptoMaybe.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setClientId(id);
  }, []);

  const connect = () => {
    if (!clientId || evtRef.current) return;
    const es = new EventSource(`/api/sse?clientId=${clientId}`);
    es.onopen = () => setConnected(true);
    es.onerror = () => setConnected(false);
    es.addEventListener("message", (e: MessageEvent) => setLastMessage(String(e.data)));
    es.addEventListener("test", (e: MessageEvent) => setLastMessage(`test: ${String(e.data)}`));
    evtRef.current = es;
  };

  const disconnect = () => {
    evtRef.current?.close();
    evtRef.current = null;
    setConnected(false);
  };

  useEffect(() => {
    return () => {
      evtRef.current?.close();
    };
  }, []);

  const emitBroadcast = async () => {
    await fetch("/api/sse/emit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event: "test", data: { time: Date.now(), scope: "broadcast" } }),
    });
  };

  const emitToMe = async () => {
    if (!clientId) return;
    await fetch("/api/sse/emit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event: "test", data: { time: Date.now(), scope: "client" }, clientId }),
    });
  };

  return (
    <div className="mx-auto max-w-xl p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Nomey SSE Test</h1>
      <div className="flex items-center gap-3">
        <button
          className="rounded bg-blue-600 px-3 py-2 text-white disabled:opacity-50 cursor-pointer"
          onClick={connected ? disconnect : connect}
          disabled={!clientId}
        >
          {connected ? "Disconnect" : "Connect"}
        </button>
        <button className="rounded bg-emerald-600 px-3 py-2 text-white cursor-pointer" onClick={emitBroadcast}>
          Emit Broadcast
        </button>
        <button
          className="rounded bg-indigo-600 px-3 py-2 text-white disabled:opacity-50 cursor-pointer"
          onClick={emitToMe}
          disabled={!clientId}
        >
          Emit To This Client
        </button>
      </div>
      <div className="rounded border p-3">
        <div className="text-sm text-gray-500">Client ID</div>
        <div className="font-mono text-sm" suppressHydrationWarning>
          {clientId || "(initializing...)"}
        </div>
      </div>
      <div className="rounded border p-3">
        <div className="text-sm text-gray-500">Latest Message</div>
        <div className="font-mono text-sm break-all">{lastMessage}</div>
      </div>
    </div>
  );
} 