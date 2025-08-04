"use client";

import { useActiveConnections } from "../hooks/use-active-connections";

function formatDuration(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString();
}

export function ActiveConnections() {
  const { connections, loading, error, refetch } = useActiveConnections(3000); // Refresh every 3 seconds

  if (error) {
    return (
      <div className="rounded-lg border border-red-500/30 bg-red-900/20 p-4">
        <h3 className="mb-2 text-lg font-semibold text-red-400">
          Error Loading Connections
        </h3>
        <p className="text-red-300">{error}</p>
        <button
          onClick={refetch}
          className="mt-2 rounded bg-red-600 px-3 py-1 text-white transition-colors hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">
          Active SSE Connections ({connections.length})
        </h3>
        <div className="flex items-center gap-2">
          {loading && (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"></div>
          )}
          <button
            onClick={refetch}
            disabled={loading}
            className="rounded bg-blue-600 px-3 py-1 text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
          >
            Refresh
          </button>
        </div>
      </div>

      {connections.length === 0 ? (
        <div className="rounded-lg border border-gray-600/30 bg-gray-800/50 p-4 text-center">
          <p className="text-gray-400">No active connections</p>
        </div>
      ) : (
        <div className="space-y-2">
          {connections.map((connection) => (
            <div
              key={connection.id}
              className="rounded-lg border border-gray-600/30 bg-gray-800/50 p-4"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-4">
                    <div>
                      <span className="text-sm text-gray-400">ID:</span>
                      <span className="ml-2 font-mono text-sm text-white">
                        {connection.id}
                      </span>
                    </div>
                    {connection.userId && (
                      <div>
                        <span className="text-sm text-gray-400">User:</span>
                        <span className="ml-2 text-sm text-green-400">
                          {connection.userId}
                        </span>
                      </div>
                    )}
                    {connection.sessionId && (
                      <div>
                        <span className="text-sm text-gray-400">Session:</span>
                        <span className="ml-2 font-mono text-sm text-blue-400">
                          {connection.sessionId}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-4 text-sm">
                    <div>
                      <span className="text-gray-400">Connected:</span>
                      <span className="ml-2 text-white">
                        {formatTimestamp(connection.connectedAt)}
                        <span className="ml-1 text-gray-400">
                          ({formatDuration(connection.connectionDuration)} ago)
                        </span>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-sm">
                    <div>
                      <span className="text-gray-400">Last Ping:</span>
                      <span className="ml-2 text-white">
                        {formatTimestamp(connection.lastPing)}
                        <span className="ml-1 text-gray-400">
                          ({formatDuration(connection.timeSinceLastPing)} ago)
                        </span>
                      </span>
                    </div>
                  </div>

                  {connection.metadata &&
                    Object.keys(connection.metadata).length > 0 && (
                      <div>
                        <span className="text-sm text-gray-400">Metadata:</span>
                        <div className="mt-1 rounded border border-gray-700/30 bg-gray-900/50 p-2 font-mono text-xs">
                          {JSON.stringify(connection.metadata, null, 2)}
                        </div>
                      </div>
                    )}
                </div>

                <div className="flex items-center">
                  <div
                    className={`h-3 w-3 rounded-full ${
                      connection.timeSinceLastPing < 60000
                        ? "bg-green-500"
                        : connection.timeSinceLastPing < 120000
                          ? "bg-yellow-500"
                          : "bg-red-500"
                    }`}
                    title={
                      connection.timeSinceLastPing < 60000
                        ? "Healthy"
                        : connection.timeSinceLastPing < 120000
                          ? "Warning"
                          : "Stale"
                    }
                  ></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
