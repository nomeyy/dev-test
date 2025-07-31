import React from "react";
import type { SSEStats } from "../types";

interface ServerStatsProps {
  stats: SSEStats | null;
}

export const ServerStats: React.FC<ServerStatsProps> = ({ stats }) => {
  return (
    <div className="rounded-xl bg-white/5 p-6">
      <h2 className="mb-4 text-xl font-semibold">Server Stats</h2>
      {stats ? (
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span>Active Connections:</span>
            <span className="font-medium text-blue-300">
              {stats.totalClients}
            </span>
          </div>
          <div className="mb-2 text-xs text-gray-400">
            (Each browser tab = 1 connection)
          </div>
          <div className="flex items-center justify-between">
            <span>Unique Users:</span>
            <span className="font-medium text-green-300">
              {stats.totalUsers}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span>Sessions:</span>
            <span className="font-medium text-purple-300">
              {stats.totalSessions}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span>Server Uptime:</span>
            <span className="font-medium text-gray-300">
              {Math.round(stats.uptime / 1000)}s
            </span>
          </div>
          {stats.totalClients > 1 && (
            <div className="mt-2 rounded bg-yellow-400/10 p-2 text-xs text-yellow-400">
              Multiple connections detected. Close other browser tabs to reduce
              count.
            </div>
          )}
        </div>
      ) : (
        <div className="text-gray-400">No stats available</div>
      )}
    </div>
  );
};
