"use client";

import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { api } from "@/trpc/react";

type Notification = {
  message: string;
  time: string;
};

export default function NotificationsPage() {
  const [inputId, setInputId] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const trigger = api.engagement.trigger.useMutation();
  const broadcast = api.engagement.broadcast.useMutation();

  // Start SSE after login
  useEffect(() => {
    if (!userId) return;
    const es = new EventSource(`/api/sse/${userId}`);

    // es.onopen = () => console.log('✅ SSE connection opened');
    es.onerror = (e) => console.error("❌ SSE error", e);

    es.addEventListener("engagement", (e: MessageEvent) => {
      const data = JSON.parse(e.data);
      setNotifications((prev) => [
        { message: data.message, time: data.time },
        ...prev,
      ]);
    });

    es.addEventListener("announcement", (e: MessageEvent) => {
      const data = JSON.parse(e.data);
      setNotifications((prev) => [
        { message: data.message, time: data.time },
        ...prev,
      ]);
    });

    es.addEventListener("ping", () => {
      console.log("heartbeat ping");
    });

    return () => es.close();
  }, [userId]);

  const triggerMockLike = async (userId: string) => {
    await fetch("/api/mock-like?id=" + userId);
  };

  return (
    <div className="relative min-h-screen w-full bg-[#f8f8f8]">
      <div
        className={`${userId ? "blur-0" : "blur-sm"} transition-all duration-300`}
      >
        <div className="px-4 py-6">
          {userId && (
            <div className="mb-4 text-sm text-gray-600">
              Logged in as <span className="font-medium">{userId}</span>
            </div>
          )}
          <h1 className="mb-6 text-2xl font-semibold">Notifications</h1>

          {notifications.length === 0 ? (
            <p className="text-gray-500">No notifications yet...</p>
          ) : (
            <ul className="space-y-3">
              {notifications.map((notif, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm"
                >
                  <div className="rounded-full bg-pink-500 p-2 text-white">
                    <Heart className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm">{notif.message}</p>
                    <p className="mt-1 text-xs text-gray-500">{notif.time}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="fixed right-4 bottom-4 z-20 flex flex-col items-end space-y-2">
          <button
            className="mt-6 rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            onClick={() => {
              if (userId) trigger.mutate({ userId });
            }}
          >
            Simulate Like Event
          </button>
          <button
            onClick={() => {
              if (userId) {
                broadcast.mutate();
              }
            }}
            className="mt-4 rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            🔊 Trigger Broadcast
          </button>
        </div>
      </div>

      {/* Prompt overlay when not logged in */}
      {!userId && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80">
          <div className="w-full max-w-sm rounded-xl border border-gray-300 bg-white p-6 text-center shadow">
            <h2 className="mb-3 text-lg font-semibold text-gray-800">
              Enter User ID
            </h2>
            <input
              type="text"
              value={inputId}
              onChange={(e) => setInputId(e.target.value)}
              placeholder="e.g. demo-user"
              className="mb-4 w-full rounded border border-gray-300 px-3 py-2 text-sm"
            />
            <button
              onClick={() => {
                if (inputId.trim()) setUserId(inputId.trim());
              }}
              className="w-full rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
            >
              Login
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
