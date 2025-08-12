"use client";

import React, { useState, useMemo } from 'react';
import { useSSE } from '../hooks/useSSE';
import type { SSEEvent } from '../types';

export interface SSEEventDisplayProps {
  className?: string;
  maxEvents?: number;
  showEventType?: boolean;
  showTimestamp?: boolean;
  showData?: boolean;
  filterEventTypes?: string[];
  autoScroll?: boolean;
}

export function SSEEventDisplay({
  className = '',
  maxEvents = 50,
  showEventType = true,
  showTimestamp = true,
  showData = true,
  filterEventTypes = [],
  autoScroll = true,
}: SSEEventDisplayProps) {
  const { lastEvent, events, clearEvents } = useSSE();
  const [filterType, setFilterType] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Combine events from hook with lastEvent
  const allEvents = useMemo(() => {
    const combined = [...events];
    if (lastEvent && !events.find(e => e.id === lastEvent.id)) {
      combined.push(lastEvent);
    }
    return combined.slice(-maxEvents);
  }, [events, lastEvent, maxEvents]);

  // Filter events based on user selection
  const filteredEvents = useMemo(() => {
    let filtered = allEvents;

    if (filterType !== 'all') {
      filtered = filtered.filter(event => event.event === filterType);
    }

    if (searchTerm) {
      filtered = filtered.filter(event => 
        event.event.toLowerCase().includes(searchTerm.toLowerCase()) ||
        JSON.stringify(event.data).toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return filtered;
  }, [allEvents, filterType, searchTerm]);

  // Get unique event types for filter dropdown
  const eventTypes = useMemo(() => {
    const types = new Set(allEvents.map(event => event.event));
    return Array.from(types).sort();
  }, [allEvents]);

  const formatTimestamp = (timestamp: Date) => {
    return timestamp.toLocaleTimeString();
  };

  const formatData = (data: any) => {
    if (typeof data === 'string') {
      return data;
    }
    return JSON.stringify(data, null, 2);
  };

  const handleClearEvents = () => {
    clearEvents();
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Controls */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex items-center space-x-2">
          <label htmlFor="filter-type" className="text-sm font-medium text-gray-700">
            Event Type:
          </label>
          <select
            id="filter-type"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Events</option>
            {eventTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center space-x-2">
          <label htmlFor="search" className="text-sm font-medium text-gray-700">
            Search:
          </label>
          <input
            id="search"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search events..."
            className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

                 <button
           onClick={handleClearEvents}
           className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
         >
           Clear Events
         </button>

        <div className="text-sm text-gray-600">
          {filteredEvents.length} of {allEvents.length} events
        </div>
      </div>

      {/* Events List */}
      <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
        {filteredEvents.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            No events to display
          </div>
        ) : (
          <div className="space-y-3">
            {filteredEvents.map((event, index) => (
              <div
                key={`${event.id || index}-${event.timestamp.getTime()}`}
                className="bg-white rounded-lg p-3 border border-gray-200 hover:border-gray-300 transition-colors"
              >
                <div className="flex items-start justify-between">
                  {showEventType && (
                    <span className="inline-block px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                      {event.event}
                    </span>
                  )}
                  
                  {showTimestamp && (
                    <span className="text-xs text-gray-500">
                      {formatTimestamp(event.timestamp)}
                    </span>
                  )}
                </div>

                {showData && event.data && (
                  <div className="mt-2">
                    <pre className="text-sm text-gray-700 bg-gray-50 p-2 rounded overflow-x-auto">
                      {formatData(event.data)}
                    </pre>
                  </div>
                )}

                {event.id && (
                  <div className="mt-2 text-xs text-gray-400">
                    ID: {event.id}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
