"use client";

import { Heartbeat } from "./HeartBeat";
import { Button } from "@/shared/components/ui/button";
import {
  UserCircle,
  Megaphone,
  Radio,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { getHomeMessageConfig, MESSAGE_TYPES } from "../../../utils/constants";
import { getIconComponent } from "../../../utils/icon-utils";
import { useHome } from "../hooks/useHome";

export const HomeDashboard = () => {
  const {
    clientId,
    status,
    heartbeat,
    logs,
    messagesEndRef,
    handleDisconnect,
    handleReconnect,
  } = useHome();

  return (
    <div className="flex w-full max-w-2xl flex-col gap-0 overflow-hidden rounded-3xl border border-white/20 bg-white/10 p-0 shadow-2xl backdrop-blur-lg">
      {/* Header & Client Info */}
      <div className="flex flex-col gap-6 bg-white/5 p-6">
        <div className="mb-2">
          <h2 className="mb-1 flex items-center gap-2 text-2xl font-extrabold text-white">
            <UserCircle className="text-[#4f8cff]" size={28} /> Client Dashboard
          </h2>
          <p className="text-sm text-white/70">
            You are connected as a client. Receive broadcasts or direct messages
            in real time below.
          </p>
        </div>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-8">
          <div className="flex items-center gap-3">
            <UserCircle className="text-[#b266ff]" size={32} />
            <div>
              <div className="text-xs text-white/60">Your Client ID</div>
              <div className="rounded bg-[#222]/70 px-3 py-1 font-mono text-base font-bold tracking-wider text-white">
                {clientId?.slice(0, 6) ?? "Anonymous"}
              </div>
            </div>
          </div>
          <div className="mt-2 flex items-center gap-3 sm:mt-0">
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
            <span className="ml-3 flex items-center gap-1.5">
              <Heartbeat heartbeatKey={heartbeat} />
            </span>
            {status === "connected" && (
              <Button
                onClick={handleDisconnect}
                className="ml-2 rounded-xl bg-gradient-to-r from-[#ff4d4d] to-[#b266ff] px-4 py-2 font-bold text-white shadow transition-transform hover:scale-105"
              >
                🔌 Disconnect
              </Button>
            )}
            {status === "disconnected" && (
              <Button
                onClick={handleReconnect}
                className="ml-2 rounded-xl bg-gradient-to-r from-[#4f8cff] to-[#b266ff] px-4 py-2 font-bold text-white shadow transition-transform hover:scale-105"
              >
                🔄 Reconnect
              </Button>
            )}
          </div>
        </div>
      </div>
      {/* Messages/Log */}
      <div className="flex flex-col gap-4 bg-white/0 p-6">
        <div className="mb-2 flex items-center gap-2">
          <Megaphone className="text-[#b266ff]" size={20} />
          <strong className="text-lg text-white">Messages</strong>
        </div>
        <div className="max-h-[50vh] flex-1 overflow-y-auto md:max-h-[60vh]">
          {logs.length === 0 ? (
            <div className="mt-2 text-[#aaa]">No messages yet</div>
          ) : (
            <ul className="m-0 list-none space-y-3 p-0">
              {logs.map((log, i) => {
                const messageConfig = getHomeMessageConfig(
                  log.type,
                  log.type === "broadcast" ? log.isTargeted : false,
                );
                const icon = getIconComponent(
                  messageConfig.iconType,
                  messageConfig.color,
                  18,
                );
                return (
                  <li
                    key={i}
                    className={`flex items-start gap-3 rounded-xl border ${messageConfig.bubbleClass} p-4 text-white shadow`}
                  >
                    <span className="mt-1">{icon}</span>
                    <div className="flex-1">
                      <div className="mb-1 font-semibold">
                        {log.type === MESSAGE_TYPES.STATUS
                          ? log.text
                          : messageConfig.label}
                      </div>
                      {log.type === MESSAGE_TYPES.STATUS ? null : (
                        <div className="text-base text-white/90">
                          {log.type === "broadcast" ? log.message : ""}
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
              <div ref={messagesEndRef} />
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};
