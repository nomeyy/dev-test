import { useState, useCallback } from "react";
import { SSEEvent } from "../types";

export const useEventLog = (maxEvents: number = 50) => {
  const [events, setEvents] = useState<SSEEvent[]>([]);
  const [lastEvent, setLastEvent] = useState<SSEEvent | null>(null);

  const addEvent = useCallback(
    (event: SSEEvent) => {
      setEvents((prev) => {
        const newEvents = [event, ...prev];
        return newEvents.slice(0, maxEvents);
      });
      setLastEvent(event);
    },
    [maxEvents],
  );

  const clearEvents = useCallback(() => {
    setEvents([]);
    setLastEvent(null);
  }, []);

  return {
    events,
    lastEvent,
    addEvent,
    clearEvents,
  };
};
