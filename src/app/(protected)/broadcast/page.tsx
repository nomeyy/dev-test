"use client";
import { useMemo, useState } from "react";
import { useSSE } from "../../../features/sse/hooks/useSSE";

export default function BroadcastPage() {
  const { events, status, clientId, reset } = useSSE("/api/sse?admin=1");
  const [message, setMessage] = useState("");
  const [targetClient, setTargetClient] = useState("");
  const [sendStatus, setSendStatus] = useState("");

  // Extract the latest client list from events
  const clients = useMemo(() => {
    const lastClientsEvent = [...events]
      .reverse()
      .find((e) => e.event === "clients");
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
            e.event === "broadcast" ||
            e.event === "client-connect" ||
            e.event === "client-disconnect",
        )
        .reverse(),
    [events],
  );

  const sendBroadcast = async () => {
    setSendStatus("");
    await fetch("/api/sse-broadcast", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event: "broadcast", data: { message } }),
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
        event: "broadcast",
        data: { message, clientId: targetClient },
      }),
    });
    setSendStatus("Message sent to client!");
    setMessage("");
  };

  return (
    <div
      style={{
        maxWidth: 700,
        margin: "40px auto",
        padding: 32,
        background: "#181c2a",
        borderRadius: 12,
        color: "#fff",
        boxShadow: "0 2px 16px #0002",
      }}
    >
      <h2 style={{ marginBottom: 24 }}>SSE Broadcast Dashboard</h2>
      <div style={{ marginBottom: 24, display: "flex", gap: 16 }}>
        <input
          type="text"
          placeholder="Message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          style={{
            flex: 1,
            padding: 8,
            borderRadius: 4,
            border: "1px solid #333",
          }}
        />
        <select
          value={targetClient}
          onChange={(e) => setTargetClient(e.target.value)}
          style={{
            padding: 8,
            borderRadius: 4,
            border: "1px solid #333",
            minWidth: 120,
          }}
        >
          <option value="">All Clients</option>
          {clients.map((id) => (
            <option key={id} value={id}>
              {id}
            </option>
          ))}
        </select>
        <button
          onClick={targetClient ? sendToClient : sendBroadcast}
          style={{
            padding: "8px 16px",
            borderRadius: 4,
            background: "#4f8cff",
            color: "#fff",
            border: "none",
            fontWeight: 600,
          }}
        >
          Send
        </button>
      </div>
      {sendStatus && (
        <div style={{ color: "lightgreen", marginBottom: 16 }}>
          {sendStatus}
        </div>
      )}
      <div style={{ marginBottom: 24 }}>
        <strong>Connected Clients ({visibleClients.length}):</strong>
        <div
          style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}
        >
          {visibleClients.length === 0 ? (
            <span style={{ color: "#aaa" }}>No clients connected</span>
          ) : (
            visibleClients.map((id) => (
              <span
                key={id}
                style={{
                  background: "#222",
                  padding: "4px 8px",
                  borderRadius: 4,
                  fontSize: 13,
                }}
              >
                {id}
              </span>
            ))
          )}
        </div>
      </div>
      <div
        style={{
          maxHeight: 200,
          overflowY: "auto",
          background: "#222",
          borderRadius: 6,
          padding: 12,
        }}
      >
        <strong>Event Log:</strong>
        {log.length === 0 ? (
          <div style={{ color: "#aaa", marginTop: 8 }}>No events yet</div>
        ) : (
          <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
            {log.map((e, i) => {
              const data =
                typeof e.data === "object" && e.data !== null
                  ? (e.data as {
                      message?: string;
                      clientId?: string;
                      id?: string;
                    })
                  : {};
              let label = "";
              let color = "";
              let icon = "";
              if (e.event === "broadcast") {
                if (data.clientId) {
                  label = `Broadcast to ${data.clientId}:`;
                  color = "#b266ff";
                  icon = "🟣";
                } else {
                  label = "Broadcast to all:";
                  color = "#4f8cff";
                  icon = "🟢";
                }
              } else if (e.event === "client-connect") {
                label = `Client connected: ${data.id}`;
                color = "#ffd700";
                icon = "🟡";
              } else if (e.event === "client-disconnect") {
                label = `Client disconnected: ${data.id}`;
                color = "#ff4d4d";
                icon = "🔴";
              }
              return (
                <li
                  key={i}
                  style={{
                    marginBottom: 12,
                    background: "#23243a",
                    borderRadius: 6,
                    padding: "10px 16px",
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <span
                    style={{
                      fontWeight: 700,
                      color,
                      fontSize: 15,
                      marginRight: 8,
                    }}
                  >
                    {icon} {label}
                  </span>
                  {e.event === "broadcast" && (
                    <span style={{ fontSize: 15 }}>{data.message}</span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <div style={{ marginTop: 24, fontSize: 13, color: "#aaa" }}>
        <div>
          Status:{" "}
          <span
            style={{
              color: status === "connected" ? "lightgreen" : "red",
              fontWeight: 600,
            }}
          >
            {status}
          </span>
        </div>

        <button
          onClick={reset}
          style={{
            marginTop: 8,
            padding: "6px 16px",
            borderRadius: 4,
            background: "#333",
            color: "#fff",
            border: "none",
            fontWeight: 600,
          }}
        >
          Clear Log
        </button>
      </div>
    </div>
  );
}
