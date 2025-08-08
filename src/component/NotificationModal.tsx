"use client";

import { useState, useEffect } from "react";
import { cn } from "@/features/shared/utils";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSend: (message: string) => void;
  type: "broadcast" | "personal";
  targetUser?: string;
}

export default function NotificationModal({
  isOpen,
  onClose,
  onSend,
  type,
  targetUser,
}: Props) {
  const [message, setMessage] = useState("");

  // Reset message when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setMessage("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isBroadcast = type === "broadcast";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-800">
        {/* Header */}
        <div
          className={cn(
            "rounded-t-xl px-6 py-4",
            isBroadcast
              ? "bg-gradient-to-r from-purple-500 to-pink-600"
              : "bg-gradient-to-r from-blue-500 to-indigo-600",
          )}
        >
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-xl font-bold text-white">
              <span className="text-2xl">{isBroadcast ? "📢" : "👤"}</span>
              {isBroadcast ? "Broadcast Message" : "Send Message"}
            </h2>
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/10 hover:text-white"
            >
              ✕
            </button>
          </div>

          {!isBroadcast && targetUser && (
            <p className="mt-1 text-sm text-white/90">
              To: <span className="font-semibold">{targetUser}</span>
            </p>
          )}

          {isBroadcast && (
            <p className="mt-1 text-sm text-white/90">
              This message will be sent to all connected users
            </p>
          )}
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Message Input */}
          <div className="mb-6 space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Message
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={
                isBroadcast
                  ? "Enter your broadcast message..."
                  : "Enter your message..."
              }
              rows={4}
              className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-black shadow-sm transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />

            <div className="text-right text-xs text-gray-500 dark:text-gray-400">
              {message.length}/500 characters
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="flex-1 rounded-lg bg-gray-300 px-4 py-2 font-medium text-gray-700 transition-colors hover:bg-gray-400 dark:bg-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                if (message.trim()) {
                  onSend(message);
                  onClose();
                }
              }}
              disabled={!message.trim()}
              className={cn(
                "flex-1 rounded-lg px-4 py-2 font-medium text-white transition-all duration-200",
                isBroadcast
                  ? "bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 disabled:from-purple-300 disabled:to-pink-400"
                  : "bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 disabled:from-blue-300 disabled:to-indigo-400",
                !message.trim() && "cursor-not-allowed opacity-50",
              )}
            >
              <div className="flex items-center justify-center gap-2">
                <span>{isBroadcast ? "📢" : "📤"}</span>
                {isBroadcast ? "Broadcast" : "Send"}
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
