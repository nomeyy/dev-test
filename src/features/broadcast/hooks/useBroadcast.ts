import { useMemo, useState } from "react";
import { useSSE } from "../../sse/hooks/useSSE";
import { EVENT_TYPES } from "@/utils/constants";

export function useBroadcast() {
  const { events, status, clientId, reset } = useSSE("/api/sse?admin=1");
  const [message, setMessage] = useState("");
  const [targetClient, setTargetClient] = useState("");
  const [sendStatus, setSendStatus] = useState("");

  // Extract the latest client list from events
  const clients = useMemo(() => {
    const lastClientsEvent = [...events]
      .reverse()
      .find((e) => e.event === EVENT_TYPES.CLIENTS);
    return lastClientsEvent &&
      "clients" in lastClientsEvent.data &&
      Array.isArray((lastClientsEvent.data as { clients: unknown }).clients)
      ? (lastClientsEvent.data as { clients: string[] }).clients
      : [];
  }, [events]);

  // Filter out the dashboard's own clientId from the client list
  const visibleClients = clients.filter((id) => id !== clientId);

  // Log of all broadcast and client-connect/disconnect events
  const log = useMemo(
    () =>
      events
        .filter(
          (e) =>
            e.event === EVENT_TYPES.BROADCAST ||
            e.event === EVENT_TYPES.CLIENT_CONNECT ||
            e.event === EVENT_TYPES.CLIENT_DISCONNECT,
        )
        .reverse(),
    [events],
  );

  const sendBroadcast = async () => {
    setSendStatus("");
    await fetch("/api/sse-broadcast", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event: EVENT_TYPES.BROADCAST, data: { message } }),
    });
    setSendStatus("Broadcast sent!");
    setMessage("");
  };

  const sendToClient = async () => {
    setSendStatus("");
    await fetch("/api/sse-broadcast", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event: EVENT_TYPES.BROADCAST,
        data: { message, clientId: targetClient },
      }),
    });
    setSendStatus("Message sent to client!");
    setMessage("");
  };

  return {
    status,
    clientId,
    reset,
    message,
    setMessage,
    targetClient,
    setTargetClient,
    sendStatus,
    setSendStatus,
    clients,
    visibleClients,
    log,
    sendBroadcast,
    sendToClient,
  };
}
