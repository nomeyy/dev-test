// src/app/(protected)/users/page.tsx

"use client";

import { trpc } from "@/utils/trpc";
import { useState, useEffect } from "react";

export default function UserListComponent() {
  const { data: sessions, isLoading } = trpc.notify.listSessions.useQuery();
  const send = trpc.notify.send.useMutation();
  const broadcast = trpc.notify.broadcast.useMutation();
  const [sendingTo, setSendingTo] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const utils = trpc.useUtils();

  useEffect(() => {
    const sse = new EventSource("/api/sse");
    sse.addEventListener("user-disconnected", () => {
      utils.notify.listSessions.invalidate(); // refetch session list
    });
    return () => sse.close();
  }, [utils]);

  const handleBroadcast = () => {
    if (!message.trim()) return;
    broadcast.mutate({ message });
    setMessage(""); // optional: clear the textarea
  };

  if (isLoading) return <p>Loading sessions...</p>;
  if (!sessions) return <p>No sessions found.</p>;

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold">Active Users</h1>

      <div className="space-y-4">
        <textarea
          name="broadcast"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Enter message to broadcast..."
          className="w-full resize-none rounded border p-2"
          rows={4}
        />
        <button
          className="rounded bg-green-600 px-4 py-2 text-white hover:bg-green-700"
          onClick={handleBroadcast}
        >
          Broadcast Message
        </button>
      </div>

      <ul className="space-y-4">
        {sessions.map((session) => (
          <li
            key={session.sessionToken}
            className="flex items-center justify-between border-b py-2"
          >
            <div>
              <p className="font-mono text-sm">{session?.user?.name}</p>
              <p className="pr-5 text-xs text-gray-500">
                User ID: {session.userId ?? "Guest"}
                <br />
                Expires: {new Date(session.expires).toLocaleString()}
              </p>
            </div>

            <button
              disabled={sendingTo === session.userId}
              onClick={() => {
                setSendingTo(session.userId);
                send.mutate(
                  {
                    userId: session?.userId ?? "test",
                    message: "🎯 Hello user!",
                  },
                  {
                    onSettled: () => setSendingTo(null),
                  },
                );
              }}
              className="rounded bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700"
            >
              {sendingTo === session.userId ? "Sending..." : "Send Message"}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
