import React from "react";
import type { SSEEvent } from "../types";
import { formatTime, getEventColor } from "../utils";

interface EventsLogProps {
  events: SSEEvent[];
  onClearEvents: () => void;
}

export const EventsLog: React.FC<EventsLogProps> = ({
  events,
  onClearEvents,
}) => {
  return (
    <div className="rounded-xl bg-white/5 p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold">Events Log ({events.length})</h2>
        <button
          onClick={onClearEvents}
          className="rounded bg-gray-600 px-3 py-1 text-sm text-white transition-colors hover:bg-gray-700"
        >
          Clear
        </button>
      </div>
      <div className="max-h-96 space-y-2 overflow-y-auto">
        {events.length === 0 ? (
          <div className="py-8 text-center text-gray-400">
            No events yet. Connect to SSE to start receiving events.
          </div>
        ) : (
          events.map((event, index) => (
            <div
              key={index}
              className={`rounded-lg border p-3 ${getEventColor(event.type)}`}
            >
              <div className="mb-2 flex items-start justify-between">
                <span className="text-sm font-medium">{event.type}</span>
                <span className="text-xs opacity-70">
                  {formatTime(event.timestamp)}
                </span>
              </div>
              <div className="text-sm opacity-90">
                <pre className="text-xs whitespace-pre-wrap">
                  {JSON.stringify(event.data, null, 2)}
                </pre>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
