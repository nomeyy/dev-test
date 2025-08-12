"use client";
import { useEffect, useState } from "react";
import { Button } from "../../../features/shared/components/ui/button";

export default function SSEPage() {
  const [messages, setMessages] = useState<string[]>([]);
  const [connected, setConnected] = useState(false);
  const [inputMessage, setInputMessage] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const eventSource = new EventSource("/api/sse");

    eventSource.onopen = () => setConnected(true);

    eventSource.onmessage = (event: MessageEvent) => {
      setMessages((prev: string[]) => [...prev, String(event.data)]);
    };

    eventSource.addEventListener("connected", (e: Event) => {
      const data = (e as MessageEvent).data as string;
      setMessages((prev) => [...prev, `connected: ${String(data)}`]);
    });

    eventSource.addEventListener("notification", (e: Event) => {
      console.log("notification", e);
      const data = (e as MessageEvent).data as string;
      setMessages((prev) => [...prev, `notification: ${String(data)}`]);
    });

    eventSource.onerror = (err: Event) => {
      console.error("SSE error:", err);
      setConnected(false);
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, []);

  const sendMessage = async () => {
    const message = inputMessage.trim();
    if (!message) return;
    try {
      setSending(true);
      await fetch("/api/send", {
        method: "POST",
        body: JSON.stringify({ message }),
        headers: { "Content-Type": "application/json" },
      });
      setInputMessage("");
    } catch (error) {
      console.error(error);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="mr-2 text-2xl font-semibold">Server-Sent Events</h1>
        <div
          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm ${connected ? "border-green-200 bg-green-50 text-green-700 dark:border-green-400/30 dark:bg-green-500/10" : "border-red-200 bg-red-50 text-red-700 dark:border-red-400/30 dark:bg-red-500/10"}`}
        >
          <span
            className={`size-2 rounded-full ${connected ? "bg-green-500" : "bg-red-500"}`}
          />
          {connected ? "Connected" : "Disconnected"}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void sendMessage();
            }
          }}
          placeholder="Type a message to send"
          className="border-input bg-background focus-visible:ring-ring/50 flex-1 rounded-md border px-3 py-2 text-sm text-black outline-none focus-visible:ring-[3px]"
        />
        <Button
          onClick={sendMessage}
          disabled={!inputMessage.trim() || sending}
        >
          {sending ? "Sending..." : "Send"}
        </Button>
      </div>

      <div className="rounded-lg border">
        <div className="text-muted-foreground border-b px-4 py-2 text-sm font-medium">
          Messages
        </div>
        <ul className="max-h-[50vh] space-y-2 overflow-auto p-4">
          {messages.length === 0 ? (
            <li className="text-muted-foreground text-sm">No messages yet.</li>
          ) : (
            messages.map((msg, idx) => (
              <li
                key={idx}
                className="bg-secondary/40 rounded-md px-3 py-2 text-sm"
              >
                {msg}
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
