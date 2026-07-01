"use client";
import { useEffect, useState } from "react";
import { useEventSource } from "@/hooks/useEventSource";

type Props = {
  userId?: string;
  username?: string;
};

export function SseTester({ userId, username }: Props) {
  const { connected, addHandler, removeHandler } = useEventSource({
    userId,
    username,
  });
  const [events, setEvents] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const onConn = (d: any) => {
      if (typeof d?.totalConnections === "number") setTotal(d.totalConnections);
      setEvents((prev) =>
        [
          {
            at: new Date().toLocaleTimeString(),
            kind: "connection-update",
            ...d,
          },
          ...prev,
        ].slice(0, 10),
      );
    };
    const onMsg = (d: any) => {
      setEvents((prev) =>
        [
          { at: new Date().toLocaleTimeString(), kind: "message", ...d },
          ...prev,
        ].slice(0, 10),
      );
    };

    addHandler("connection-update", onConn);
    addHandler("message", onMsg);
    return () => {
      removeHandler("connection-update");
      removeHandler("message");
    };
  }, [addHandler, removeHandler]);

  const broadcast = async () => {
    try {
      setBusy(true);
      await fetch("/api/sse/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: "server",
          type: "data:update",
          data: { message: "Hello SSE clients!" },
          timestamp: new Date().toISOString(),
        }),
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-lg border border-zinc-200/70 bg-white p-4 shadow">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-medium text-zinc-800">SSE Tester</h3>
        <span
          className={`rounded px-2 py-0.5 text-xs ${connected ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}
        >
          {connected ? "connected" : "disconnected"}
        </span>
      </div>
      <p className="text-sm text-zinc-600">
        Total connections:{" "}
        <span className="font-medium text-zinc-800">{total}</span>
      </p>
      <button
        onClick={broadcast}
        disabled={busy}
        className="mt-3 rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-60"
      >
        {busy ? "Sending..." : "Broadcast SSE message"}
      </button>
      <ul className="mt-3 max-h-48 space-y-1 overflow-y-auto text-sm">
        {events.map((e, i) => (
          <li key={i} className="border-b border-zinc-100 py-1">
            <span className="text-zinc-500">{e.at}</span> —{" "}
            <span className="font-medium text-zinc-800">{e.kind}</span> —{" "}
            <span className="text-zinc-700">{String(e.type)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
