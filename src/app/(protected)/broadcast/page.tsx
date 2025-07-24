"use client";
import { useBroadcast } from "../../../features/broadcast/hooks/useBroadcast";
import { Button } from "../../../features/shared/components/ui/button";

export default function BroadcastPage() {
  const {
    status,
    reset,
    message,
    setMessage,
    targetClient,
    setTargetClient,
    sendStatus,
    clients,
    visibleClients,
    log,
    sendBroadcast,
    sendToClient,
  } = useBroadcast();

  return (
    <div className="mx-auto mt-10 max-w-[700px] rounded-xl bg-[#181c2a] p-8 text-white shadow-lg">
      <h2 className="mb-6">SSE Broadcast Dashboard</h2>
      <div className="mb-6 flex gap-4">
        <input
          type="text"
          placeholder="Message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="flex-1 rounded border border-[#333] p-2"
        />
        <select
          value={targetClient}
          onChange={(e) => setTargetClient(e.target.value)}
          className="min-w-[120px] rounded border border-[#333] p-2"
        >
          <option value="">All Clients</option>
          {clients.map((id) => (
            <option key={id} value={id}>
              {id}
            </option>
          ))}
        </select>
        <Button
          onClick={targetClient ? sendToClient : sendBroadcast}
          className="rounded bg-[#4f8cff] px-4 py-2 font-semibold text-white"
        >
          Send
        </Button>
      </div>
      {sendStatus && <div className="mb-4 text-green-300">{sendStatus}</div>}
      <div className="mb-6">
        <strong>Connected Clients ({visibleClients.length}):</strong>
        <div className="mt-2 flex flex-wrap gap-2">
          {visibleClients.length === 0 ? (
            <span className="text-[#aaa]">No clients connected</span>
          ) : (
            visibleClients.map((id) => (
              <span key={id} className="rounded bg-[#222] px-2 py-1 text-sm">
                {id}
              </span>
            ))
          )}
        </div>
      </div>
      <div className="max-h-[200px] overflow-y-auto rounded bg-[#222] p-3">
        <strong>Event Log:</strong>
        {log.length === 0 ? (
          <div className="mt-2 text-[#aaa]">No events yet</div>
        ) : (
          <ul className="m-0 list-none p-0">
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
                  className="mb-3 flex items-center gap-2 rounded bg-[#23243a] p-3 text-white"
                >
                  <span className="mr-2 font-bold" style={{ color }}>
                    {icon} {label}
                  </span>
                  {e.event === "broadcast" && (
                    <span className="text-base">{data.message}</span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <div className="mt-6 text-sm text-[#aaa]">
        <div>
          Status:{" "}
          <span
            className={
              status === "connected"
                ? "font-semibold text-green-300"
                : "font-semibold text-red-500"
            }
          >
            {status}
          </span>
        </div>
        <Button
          onClick={reset}
          className="mt-2 rounded bg-[#333] px-4 py-1 font-semibold text-white"
        >
          Clear Log
        </Button>
      </div>
    </div>
  );
}
