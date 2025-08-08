import { useState, useEffect } from "react";

export type Client = {
  id: string;
  name?: string | null;
  image?: string | null;
};

export type Message = {
  type: string;
  clientId?: string;
  clients?: Client[];
  message?: string;
};

export function useSSEConnection() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [connectedClients, setConnectedClients] = useState<Client[]>([]);
  const [connectionStatus, setConnectionStatus] = useState("Connecting...");

  useEffect(() => {
    let eventSource: EventSource;
    let reconnectTimeout: NodeJS.Timeout | null = null;

    const connect = () => {
      eventSource = new EventSource("/api/sse");

      eventSource.onopen = () => setConnectionStatus("Connected");

      eventSource.onmessage = (event: MessageEvent<string>) => {
        const data = JSON.parse(event.data) as Message;
        if (data.type === "connections") {
          setConnectedClients(data.clients ?? []);
        } else {
          setMessages((prev) => [...prev, data]);
        }
      };

      eventSource.onerror = () => {
        setConnectionStatus("Disconnected");
        eventSource.close();
        reconnectTimeout = setTimeout(connect, 5000);
      };
    };

    connect();

    return () => {
      eventSource.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      setConnectionStatus("Disconnected");
    };
  }, []);

  return { messages, connectedClients, connectionStatus };
}
