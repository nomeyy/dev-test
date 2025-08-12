"use client";

import { useEffect, useState } from "react";
import useSSE from "@/shared/hooks/useSSE";

const ClientSSEComponent = () => {
  const [lastMessage, setLastMessage] = useState<string>("-");

  const { connected, messages } = useSSE({
    url: "/api/sse",
    eventNames: ["open", "message", "ping"],
  });

  useEffect(() => {
    const last = messages[0]?.data ?? "-";
    setLastMessage(last);
  }, [messages]);

  return (
    <div>
      <div className="mt-4 rounded-md border p-3">
        <p className="text-xs">Connected: {String(connected)}</p>
        <p className="text-sm font-semibold">SSE last message:</p>
        <p className="text-muted-foreground text-xs break-all">{lastMessage}</p>
      </div>
    </div>
  );
};

export default ClientSSEComponent;
