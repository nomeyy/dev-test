"use client";
import { useHome } from "../../../features/home/hooks/useHome";
import { Button } from "../../../features/shared/components/ui/button";
import { Heartbeat } from "../../../features/shared/components/ui/heartbeat";

export default function HomePage() {
  const {
    clientId,
    status,
    heartbeat,
    logs,
    messagesEndRef,
    handleDisconnect,
    handleReconnect,
    reset,
  } = useHome();

  return (
    <div className="mx-auto mt-10 max-w-[600px] rounded-xl bg-[#181c2a] p-8 text-white shadow-lg">
      <div className="mb-6 flex items-center">
        <span className="text-lg font-semibold">Client ID:</span>
        <span className="ml-3 rounded bg-[#222] px-2.5 py-1 text-base">
          {clientId ?? "..."}
        </span>
        <span className="ml-6 font-semibold">Status:</span>
        <span
          className={
            "ml-2 font-semibold " +
            (status === "connected" ? "text-green-300" : "text-red-500")
          }
        >
          {status}
        </span>
        {/* Heartbeat indicator */}
        <span className="ml-6 flex items-center gap-1.5">
          <Heartbeat heartbeatKey={heartbeat} />
        </span>
        {status === "connected" && (
          <Button
            onClick={handleDisconnect}
            className="ml-4 rounded bg-[#ff4d4d] px-3 py-1 font-semibold text-white"
          >
            Disconnect
          </Button>
        )}
        {status === "disconnected" && (
          <Button
            onClick={handleReconnect}
            className="ml-4 rounded bg-[#4f8cff] px-3 py-1 font-semibold text-white"
          >
            Reconnect
          </Button>
        )}
      </div>
      <div className="mb-4 max-h-[260px] overflow-y-auto rounded bg-[#222] p-3">
        <strong>Messages:</strong>
        {logs.length === 0 ? (
          <div className="mt-2 text-[#aaa]">No messages yet</div>
        ) : (
          <ul className="m-0 list-none p-0">
            {logs.map((log, i) =>
              log.type === "status" ? (
                <li key={i} className="mb-2 font-semibold text-[#ffd700]">
                  {log.text}
                </li>
              ) : (
                <li
                  key={i}
                  className={`mb-3 flex items-center gap-2 rounded p-3 text-white ${log.isTargeted ? "bg-[#2d1a4d]" : "bg-[#1a2d1a]"}`}
                >
                  <span
                    className={`mr-2 font-bold ${log.isTargeted ? "text-[#b266ff]" : "text-[#4f8cff]"}`}
                  >
                    {log.isTargeted ? "🟣 Direct to you:" : "🟢 Broadcast:"}
                  </span>
                  <span className="text-base">{log.message}</span>
                </li>
              ),
            )}
            <div ref={messagesEndRef} />
          </ul>
        )}
      </div>
      <Button
        onClick={reset}
        className="mt-2 rounded bg-[#333] px-4 py-1 font-semibold text-white"
      >
        Clear Messages
      </Button>
    </div>
  );
}
