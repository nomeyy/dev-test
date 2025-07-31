"use client";

import { useEffect, useRef, useState } from "react";
import TriggerSSE from "./trigger-button";

export default function SSETester() {
  const [message, setMessage] = useState("Not connected");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  const subscribe = () => {
    if (eventSourceRef.current) {
      console.warn("⚠️ Already subscribed to SSE");
      return;
    }
    try {
      const es = new EventSource("/api/sse");
      es.onopen = () => console.log("✅ SSE opened");

      es.addEventListener("ping", () => {
        console.log("💓 Ping received");
      });

      es.addEventListener("test_event", (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log("📨 test_event:", data);
          setMessage(`📨 ${data.message}`);
        } catch (err) {
          console.error("❌ Failed to parse test_event data:", event.data, err);
        }
      });

      es.addEventListener("user_event", (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log("👤 user_event:", data);
          setMessage(`👤 Private: ${data.message}`);
        } catch (err) {
          console.error("❌ Failed to parse user_event data:", event.data, err);
        }
      });

      es.onerror = (e) => {
        console.error("SSE error", e);
        es.close();
        eventSourceRef.current = null;
        setIsSubscribed(false);
        setMessage("❌ Disconnected due to error");
      };

      eventSourceRef.current = es;
      setIsSubscribed(true);
      setMessage("✅ Subscribed");
    } catch (error) {
      console.error("❌ Failed to subscribe to SSE:", error);
      setMessage("❌ Error subscribing to SSE");
    }
  };

  const unsubscribe = () => {
    if (eventSourceRef.current) {
      try {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
        setIsSubscribed(false);
        setMessage("📴 Unsubscribed");
      } catch (error) {
        console.warn("⚠️ Failed to close SSE connection", error);
      }
    }
  };

  useEffect(() => {
    return () => {
      unsubscribe();
    };
  }, []);

  return (
    <>
      <div className="space-y-4 rounded border p-4">
        <p className="font-bold">Latest SSE:</p>
        <div className="rounded bg-gray-700 p-2 font-mono text-sm">
          {message}
        </div>

        <div className="space-x-2">
          <button
            onClick={subscribe}
            disabled={isSubscribed}
            className="rounded border bg-green-700 px-4 py-1"
          >
            Subscribe
          </button>
          <button
            onClick={unsubscribe}
            disabled={!isSubscribed}
            className="rounded border bg-red-700 px-4 py-1"
          >
            Unsubscribe
          </button>
        </div>
        {isSubscribed && <TriggerSSE />}
      </div>
    </>
  );
}
