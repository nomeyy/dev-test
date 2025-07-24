"use client";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type EventData = {
  id: number;
  eventType: string;
  data: string;
  timestamp: string;
};

export default function Home({ initialTopics = [] }) {
  const [events, setEvents] = useState<EventData[]>([]);
  const [connected, setConnected] = useState(false);
  const eventIdRef = useRef(0);

  const searchParams = useSearchParams();

  const clientId = searchParams?.get("id") ?? "client-123";

  const [topics, setTopics] = useState<string[]>(initialTopics);
  const [newTopic, setNewTopic] = useState("");
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!clientId || topics.length === 0) {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      setConnected(false);
      return;
    }

    const topicParam = encodeURIComponent(topics.join(","));
    const es = new EventSource(`/api/sse?id=${clientId}&events=${topicParam}`);
    eventSourceRef.current = es;

    es.onopen = () => setConnected(true);
    es.close = () => setConnected(false);
    es.onerror = (err) => {
      console.error("SSE error:", err);
      setConnected(false);
      es.close();
    };

    const genericListener = (e: MessageEvent) => {
      if (e.type === "ping") return;
      try {
        eventIdRef.current += 1;
        setEvents((prev) => [
          {
            id: eventIdRef.current,
            eventType: e.type,
            data: "",
            timestamp: new Date().toLocaleTimeString(),
          },
          ...prev,
        ]);
      } catch {
        // ignore JSON parse errors
      }
    };

    es.onmessage = genericListener;
    topics.forEach((topic) => es.addEventListener(topic, genericListener));

    return () => {
      es.close();
      setConnected(false);
    };
  }, [clientId, topics]);

  const addTopic = () => {
    const topicTrimmed = newTopic.trim();
    if (topicTrimmed && !topics.includes(topicTrimmed)) {
      setTopics((prev) => [...prev, topicTrimmed]);
      setNewTopic("");
      void sendMessage(topicTrimmed);
    }
  };

  const removeTopic = (topicToRemove: string) => {
    setTopics((prev) => prev.filter((t) => t !== topicToRemove));
  };

  const sendMessage = async (event: string) => {
    await fetch("/api/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: clientId,
        message: "Hello from server!",
        event,
      }),
    });
  };

  return (
    <main style={{ padding: 40 }}>
      <h1>SSE Demo</h1>

      <div className="mx-auto max-w-xl rounded-md border border-gray-200 bg-white p-4 shadow-md">
        <h2 className="mb-2 text-xl font-semibold">Live SSE Events</h2>
        <p
          className={`mb - 4 font-medium ${connected ? "text-green-600" : "text-red-600"}`}
        >
          {connected ? "Connected" : "Disconnected"}
        </p>

        <div className="max-h-96 space-y-3 overflow-y-auto rounded border bg-gray-50 p-2">
          {events.length === 0 && (
            <p className="text-center text-gray-500 italic">
              No events received yet.
            </p>
          )}
          {events.map(({ id, eventType, data, timestamp }) => (
            <div
              key={id}
              className="rounded border border-gray-300 bg-white p-3 shadow-sm transition hover:shadow-md"
            >
              <div className="mb-1 flex justify-between text-sm text-gray-500">
                <span className="text-xs">
                  Event :{" "}
                  <span className="text-sm font-medium text-black">
                    {eventType}
                  </span>
                </span>
                <span>{timestamp}</span>
              </div>
              <pre className="overflow-x-auto text-xs text-gray-700">
                {JSON.stringify(data, null, 2)}
              </pre>
            </div>
          ))}
        </div>
      </div>
      <div className="mb-4">
        <label htmlFor="newTopic" className="mb-1 block font-semibold">
          Add Event Topic
        </label>
        <div className="flex gap-2">
          <input
            id="newTopic"
            type="text"
            value={newTopic}
            onChange={(e) => setNewTopic(e.target.value)}
            className="flex-grow rounded border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-400 focus:outline-none"
            placeholder="Enter event topic name (e.g., chat-message)"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addTopic();
              }
            }}
          />
          <button
            onClick={addTopic}
            className="rounded bg-blue-600 px-4 py-2 text-white transition hover:bg-blue-700"
            type="button"
          >
            Add
          </button>
        </div>
      </div>
    </main>
  );
}
