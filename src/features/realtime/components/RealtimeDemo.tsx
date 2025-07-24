"use client";

import { api } from "@/trpc/react";

export function RealtimeDemo() {
  // Subscribe to real-time events
  const { data } = api.realtime.subscribe.useSubscription({});

  // Mutations for testing
  const sendPersonalTest = api.realtime.sendTest.useMutation();
  const sendBroadcast = api.realtime.sendBroadcast.useMutation();

  return (
    <div className="mx-auto max-w-lg rounded-lg bg-white p-6 shadow-md">
      <h2 className="mb-4 text-xl font-bold text-gray-900">Real-Time Events</h2>
      <div className="mb-4 space-y-1 text-sm text-gray-600">
        <div>Heartbeat enabled (30s intervals)</div>
        <div>User-specific events</div>
        <div>Broadcast events</div>
      </div>

      <div className="mb-6 space-y-2">
        <button
          onClick={() => sendPersonalTest.mutate({})}
          disabled={sendPersonalTest.isPending}
          className="w-full rounded bg-blue-500 px-4 py-2 font-medium text-white hover:bg-blue-600 disabled:bg-blue-300"
        >
          {sendPersonalTest.isPending ? "Sending..." : "Personal Event"}
        </button>

        <button
          onClick={() => sendBroadcast.mutate()}
          disabled={sendBroadcast.isPending}
          className="w-full rounded bg-green-500 px-4 py-2 font-medium text-white hover:bg-green-600 disabled:bg-green-300"
        >
          {sendBroadcast.isPending ? "Broadcasting..." : "Broadcast to All"}
        </button>
      </div>

      {/* Events Display */}
      <div className="min-h-[200px] rounded border bg-gray-50 p-4">
        <h3 className="mb-3 font-semibold text-gray-900">Live Events:</h3>
        <div className="max-h-80 space-y-3 overflow-y-auto">
          {data ? (
            <div
              className={`rounded border-l-4 p-3 ${
                data.data.type === "success"
                  ? "border-green-500 bg-green-50"
                  : data.data.type === "error"
                    ? "border-red-500 bg-red-50"
                    : data.data.type === "warning"
                      ? "border-yellow-500 bg-yellow-50"
                      : "border-blue-500 bg-blue-50"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h4 className="truncate text-sm font-medium text-gray-900">
                    {data.data.title}
                  </h4>
                  {data.data.message && (
                    <p className="mt-1 text-sm leading-relaxed break-words text-gray-700">
                      {data.data.message}
                    </p>
                  )}
                </div>
                <div className="flex flex-shrink-0 flex-col items-end gap-1">
                  <span
                    className={`rounded px-2 py-1 text-xs font-medium whitespace-nowrap ${
                      data.data.userId && data.data.userId !== "system"
                        ? "bg-blue-100 text-blue-800"
                        : "bg-green-100 text-green-800"
                    }`}
                  >
                    {data.data.userId && data.data.userId !== "system"
                      ? "Personal"
                      : "Broadcast"}
                  </span>
                  <span className="text-xs whitespace-nowrap text-gray-600">
                    {new Date(data.data.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center">
              <p className="mb-1 text-gray-500">No events yet</p>
              <p className="text-xs text-gray-400">
                Click buttons above to test
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Connection Status */}
      <div className="mt-4 text-center text-xs">
        <span className="text-gray-500">
          SSE Connection:{" "}
          <span className="font-medium text-green-600">Active</span>
        </span>
      </div>
    </div>
  );
}
