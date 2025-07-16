"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import { Button } from "@/shared/components/ui/button";

const SSEDemo = () => {
  const [latest, setLatest] = useState<string>("none");
  const [connected, setConnected] = useState(false);

  api.sse.events.useSubscription(undefined, {
    enabled: connected,
    onData(event) {
      if (event.event === "mock") {
        setLatest(JSON.stringify(event, null, 2));
      }
    },
  });

  const toggleConnection = () => {
    setConnected((prev) => {
      if (prev) setLatest("none");
      return !prev;
    });
  };

  return (
    <div className="flex flex-col items-start gap-2">
      <Button onClick={toggleConnection}>
        {connected ? "Disconnect from SSE" : "Connect to SSE"}
      </Button>
      <pre className="whitespace-pre-wrap">{latest}</pre>
    </div>
  );
};

export default SSEDemo;
