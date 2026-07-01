"use client";
import { useSSE } from "@/hooks/useSSE";

export function ConnectionStatus() {
  const { status, connectionInfo } = useSSE({
    autoConnect: true,
    path: "/socket.io",
    url: typeof window !== "undefined" ? window.location.origin : undefined,
  });
  console.log("ConnectionStatus:", { connectionInfo });
  return (
    <div className="fixed right-4 bottom-4 z-50 rounded-lg border border-gray-200 bg-white p-4 shadow-lg">
      <div className="flex items-center gap-3">
        <div
          className={`h-3 w-3 rounded-full ${
            status === "connected"
              ? "animate-pulse bg-green-500"
              : status === "connecting"
                ? "bg-yellow-500"
                : "bg-red-500"
          }`}
        />
        <div>
          <p className="text-sm font-medium">Status: {status.toUpperCase()}</p>
          <p className="text-xs text-gray-500">
            {connectionInfo.totalConnections} active connections
          </p>
        </div>
      </div>

      {status === "disconnected" && (
        <button
          onClick={() => window.location.reload()}
          className="mt-2 w-full rounded bg-blue-500 px-3 py-1 text-xs text-white transition hover:bg-blue-600"
        >
          Reconnect
        </button>
      )}
    </div>
  );
}
