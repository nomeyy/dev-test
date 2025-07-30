"use client";

import { Button } from "../../../features/shared/components/ui/button";
import { Input } from "../../../features/shared/components/ui/input";
import { Select } from "../../../features/shared/components/ui/select";
import {
  Megaphone,
  Users,
  User,
  Radio,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { getEventConfig, EVENT_TYPES } from "../../../utils/constants";
import { getIconComponent } from "../../../utils/icon-utils";
import { useBroadcast } from "../hooks/useBroadcast";

export const BroadcastDashboard = () => {
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
    <div className="flex w-full max-w-5xl flex-col gap-0 overflow-hidden rounded-3xl border border-white/20 bg-white/10 p-0 shadow-2xl backdrop-blur-lg md:flex-row md:gap-8">
      {/* Left: Broadcast Sender & Clients */}
      <div className="flex min-w-[320px] flex-1 flex-col gap-8 bg-white/5 p-6">
        {/* Header */}
        <div className="mb-2">
          <h2 className="mb-1 flex items-center gap-2 text-2xl font-extrabold text-white">
            <Megaphone className="text-[#4f8cff]" size={28} /> Broadcast
            Dashboard
          </h2>
          <p className="text-sm text-white/70">
            Send messages to all clients or target a specific client. See
            real-time events below.
          </p>
        </div>
        {/* Broadcast Sender */}
        <div className="flex flex-col gap-4 rounded-2xl bg-white/10 p-5 shadow">
          <div className="flex flex-col gap-3">
            <Input
              type="text"
              placeholder="Type your message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              variant="glassmorphism"
              className="rounded-xl"
            />
            <Select
              value={targetClient}
              onChange={(e) => setTargetClient(e.target.value)}
              variant="glassmorphism"
              className="min-w-[140px] rounded-xl"
            >
              <option value="">All Clients</option>
              {clients.map((id) => (
                <option key={id} value={id} className="text-black">
                  {id}
                </option>
              ))}
            </Select>
            <Button
              onClick={targetClient ? sendToClient : sendBroadcast}
              size="lg"
              className="rounded-xl bg-gradient-to-r from-[#4f8cff] to-[#b266ff] font-bold text-white shadow-lg transition-transform duration-150 hover:scale-105"
            >
              <Megaphone size={18} />
              {targetClient ? "Send Direct" : "Send All"}
            </Button>
          </div>
          {sendStatus && (
            <div className="animate-pulse text-center font-semibold text-green-300">
              {sendStatus}
            </div>
          )}
        </div>
        {/* Clients List */}
        <div className="flex flex-col gap-3 rounded-2xl bg-white/10 p-5 shadow">
          <div className="mb-2 flex items-center gap-2">
            <Users className="text-[#b266ff]" size={20} />
            <strong className="text-lg text-white">Connected Clients</strong>
            <span className="rounded-full bg-[#4f8cff]/30 px-3 py-1 text-xs font-bold text-white">
              {visibleClients.length}
            </span>
          </div>
          <div className="flex flex-wrap gap-3">
            {visibleClients.length === 0 ? (
              <span className="text-[#aaa]">No clients connected</span>
            ) : (
              visibleClients.map((id) => (
                <span
                  key={id}
                  className="flex items-center gap-2 rounded-xl border border-white/10 bg-gradient-to-br from-[#4f8cff]/30 to-[#b266ff]/30 px-3 py-2 text-sm text-white shadow"
                >
                  <User className="text-[#4f8cff]" size={18} />
                  <span className="font-mono font-bold">{id.slice(0, 6)}</span>
                </span>
              ))
            )}
          </div>
        </div>
        {/* Status */}
        <div className="mt-2 flex items-center gap-3">
          <Radio className="text-[#4f8cff]" size={18} />
          <span className="font-semibold text-white">Status:</span>
          <span
            className={
              status === "connected"
                ? "flex animate-pulse items-center gap-1 font-bold text-green-300"
                : "flex animate-pulse items-center gap-1 font-bold text-red-400"
            }
          >
            {status === "connected" ? (
              <CheckCircle size={16} />
            ) : (
              <XCircle size={16} />
            )}{" "}
            {status}
          </span>
          <Button
            onClick={reset}
            variant="outline"
            className="ml-auto rounded-xl bg-[#333]/80 text-white shadow transition-colors"
          >
            🧹 Clear Log
          </Button>
        </div>
      </div>
      {/* Right: Event Log */}
      <div className="flex min-w-[320px] flex-1 flex-col bg-white/0 p-6">
        <div className="mb-3 flex items-center gap-2">
          <Megaphone className="text-[#b266ff]" size={20} />
          <strong className="text-lg text-white">Event Log</strong>
        </div>
        <div className="max-h-[60vh] flex-1 overflow-y-auto md:max-h-[80vh]">
          {log.length === 0 ? (
            <div className="mt-2 text-[#aaa]">No events yet</div>
          ) : (
            <ul className="m-0 list-none space-y-3 p-0">
              {log.map((e, i) => {
                const data =
                  typeof e.data === "object" && e.data !== null ? e.data : {};

                const eventConfig = getEventConfig(e.event, data);
                const icon = getIconComponent(
                  eventConfig.iconType,
                  eventConfig.color,
                  18,
                );
                return (
                  <li
                    key={i}
                    className={`flex items-start gap-3 rounded-xl border ${eventConfig.bubbleClass} p-4 text-white shadow`}
                  >
                    <span className="mt-1">{icon}</span>
                    <div className="flex-1">
                      <div
                        className="font-semibold"
                        style={{ color: eventConfig.color }}
                      >
                        {eventConfig.label}
                      </div>
                      {e.event === EVENT_TYPES.BROADCAST && (
                        <div className="mt-1 text-base text-white/90">
                          {(data as { message?: string }).message}
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};
