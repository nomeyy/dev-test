import React from "react";
import type { SendTarget } from "../types";

interface MessageSenderProps {
  sendTarget: SendTarget;
  setSendTarget: (target: SendTarget) => void;
  sendTargetId: string;
  setSendTargetId: (id: string) => void;
  sendMessage: string;
  setSendMessage: (message: string) => void;
  onSendMessage: () => void;
}

export const MessageSender: React.FC<MessageSenderProps> = ({
  sendTarget,
  setSendTarget,
  sendTargetId,
  setSendTargetId,
  sendMessage,
  setSendMessage,
  onSendMessage,
}) => {
  return (
    <div className="mb-8 rounded-xl bg-white/5 p-6">
      <h2 className="mb-4 text-xl font-semibold">Send Test Message</h2>
      <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-4">
        <div>
          <label className="mb-2 block text-sm font-medium">Target</label>
          <select
            value={sendTarget}
            onChange={(e) => setSendTarget(e.target.value as SendTarget)}
            className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white"
          >
            <option value="user">To User</option>
            <option value="session">To Session</option>
            <option value="client">To Client</option>
            <option value="broadcast">Broadcast All</option>
          </select>
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium">Target ID</label>
          <input
            type="text"
            value={sendTargetId}
            onChange={(e) => setSendTargetId(e.target.value)}
            disabled={sendTarget === "broadcast"}
            className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white placeholder-gray-400 disabled:opacity-50"
            placeholder={
              sendTarget === "client"
                ? "Client ID"
                : sendTarget === "user"
                  ? "User ID"
                  : "Session ID"
            }
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium">Message</label>
          <input
            type="text"
            value={sendMessage}
            onChange={(e) => setSendMessage(e.target.value)}
            className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white placeholder-gray-400"
            placeholder="Enter your message"
          />
        </div>
        <div className="flex items-end">
          <button
            onClick={onSendMessage}
            disabled={!sendMessage.trim()}
            className="w-full rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700 disabled:bg-gray-600 disabled:opacity-50"
          >
            Send Message
          </button>
        </div>
      </div>
    </div>
  );
};
