import React from "react";
import type { SSEEvent } from "../types";
import { formatTime } from "../utils";

interface LatestEventProps {
  lastEvent: SSEEvent | null;
}

export const LatestEvent: React.FC<LatestEventProps> = ({ lastEvent }) => {
  return (
    <div className="rounded-xl bg-white/5 p-6">
      <h2 className="mb-4 text-xl font-semibold">Latest Event</h2>
      {lastEvent ? (
        <div className="space-y-2">
          <div className="text-sm font-medium text-blue-300">
            {lastEvent.type}
          </div>
          <div className="truncate text-xs text-gray-300">
            {JSON.stringify(lastEvent.data).substring(0, 40)}...
          </div>
          <div className="text-xs text-gray-400">
            {formatTime(lastEvent.timestamp)}
          </div>
        </div>
      ) : (
        <div className="text-gray-400">No events yet</div>
      )}
    </div>
  );
};
