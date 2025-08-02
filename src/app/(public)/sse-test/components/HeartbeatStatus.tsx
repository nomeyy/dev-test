import React from "react";
import type { SSEStats } from "../types";
import { formatTime } from "../utils";

interface HeartbeatStatusProps {
  stats: SSEStats | null;
}

export const HeartbeatStatus: React.FC<HeartbeatStatusProps> = ({ stats }) => {
  return (
    <div className="rounded-xl bg-white/5 p-6">
      <h2 className="mb-4 text-xl font-semibold">Heartbeat Status</h2>
      {stats ? (
        <div className="space-y-2 text-sm">
          <div>
            Enabled:{" "}
            <span
              className={`font-medium ${
                stats.heartbeatEnabled ? "text-green-400" : "text-red-400"
              }`}
            >
              {stats.heartbeatEnabled ? "Yes" : "No"}
            </span>
          </div>
          {stats.heartbeatEnabled ? (
            <>
              <div>
                Interval:{" "}
                <span className="font-medium text-blue-300">
                  {stats.heartbeatInterval
                    ? `${stats.heartbeatInterval}ms`
                    : "N/A"}
                </span>
              </div>
              <div>
                Timeout:{" "}
                <span className="font-medium text-blue-300">
                  {stats.heartbeatTimeout
                    ? `${stats.heartbeatTimeout}ms`
                    : "N/A"}
                </span>
              </div>
              <div>
                Received pings:{" "}
                <span className="font-medium text-green-300">
                  {stats.totalHeartbeatsReceived || 0}
                </span>
              </div>
              <div>
                Status Updates:{" "}
                <span className="font-medium text-purple-300">
                  {stats.totalHeartbeatsSent || 0}
                </span>
              </div>
              <div>
                Last heartbeat:{" "}
                <span className="font-medium text-gray-300">
                  {stats.lastHeartbeat
                    ? formatTime(stats.lastHeartbeat.toString())
                    : "Never"}
                </span>
              </div>
            </>
          ) : (
            <div className="mt-2 text-xs text-gray-400">
              Heartbeat is disabled
            </div>
          )}
        </div>
      ) : (
        <div className="text-gray-400">Loading heartbeat data...</div>
      )}
    </div>
  );
};
