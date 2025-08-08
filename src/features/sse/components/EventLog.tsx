"use client";

import { useState } from "react";
import type { SSEEvent } from "@/hooks/useSSEConnection";

interface EventLogProps {
  events: SSEEvent[];
  onClear: () => void;
}

export function EventLog({ events, onClear }: EventLogProps) {
  const [filter, setFilter] = useState("");
  const [expandedEvents, setExpandedEvents] = useState<Set<number>>(new Set());

  const filteredEvents = events.filter(event => {
    if (!filter) return true;
    return (
      event.type.toLowerCase().includes(filter.toLowerCase()) ||
      JSON.stringify(event.data).toLowerCase().includes(filter.toLowerCase())
    );
  });

  const toggleExpanded = (index: number) => {
    const newExpanded = new Set(expandedEvents);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedEvents(newExpanded);
  };

  const getEventColor = (type: string) => {
    switch (type) {
      case "connection_established":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "connection_closed":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "heartbeat":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "broadcast":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
      case "notification":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "event_sent":
        return "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200";
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Event Log ({filteredEvents.length} events)
        </h2>
        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter events..."
            className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
          <button
            onClick={onClear}
            className="px-3 py-1 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm transition-colors dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
          >
            Clear
          </button>
        </div>
      </div>

      <div className="space-y-2 max-h-96 overflow-y-auto">
        {filteredEvents.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-center py-8">
            No events received yet
          </p>
        ) : (
          filteredEvents.map((event, index) => (
            <div
              key={`${event.timestamp}-${index}`}
              className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 hover:shadow-md transition-shadow"
            >
              <div
                className="flex items-center justify-between cursor-pointer"
                onClick={() => toggleExpanded(index)}
              >
                <div className="flex items-center space-x-3">
                  <span className={`px-2 py-1 rounded-md text-xs font-medium ${getEventColor(event.type)}`}>
                    {event.type}
                  </span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {new Date(event.timestamp).toLocaleTimeString()}
                  </span>
                  {event.id && (
                    <span className="text-xs text-gray-500 dark:text-gray-500">
                      ID: {event.id}
                    </span>
                  )}
                </div>
                <svg
                  className={`h-5 w-5 text-gray-400 transform transition-transform ${
                    expandedEvents.has(index) ? "rotate-90" : ""
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                </svg>
              </div>
              
              {expandedEvents.has(index) && (
                <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-md">
                  <pre className="text-xs text-gray-700 dark:text-gray-300 overflow-x-auto">
                    {JSON.stringify(event.data, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}