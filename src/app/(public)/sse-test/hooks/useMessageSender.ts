import { useState, useCallback } from "react";
import { SendTarget, SSEEvent } from "../types";

export const useMessageSender = () => {
  const [sendTarget, setSendTarget] = useState<SendTarget>("user");
  const [sendTargetId, setSendTargetId] = useState("user_123");
  const [sendMessage, setSendMessage] = useState("Hello from SSE test!");

  const sendTestMessage = useCallback(
    async (onEventAdd?: (event: SSEEvent) => void) => {
      if (!sendMessage.trim()) return;

      try {
        const payload = {
          target: sendTarget,
          targetId: sendTarget === "broadcast" ? undefined : sendTargetId,
          event: {
            type: "test_message",
            data: {
              message: sendMessage,
              sentBy: "SSE Test UI",
              timestamp: new Date().toISOString(),
            },
          },
        };

        const response = await fetch("/api/sse/send", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        const result = await response.json();

        if (result.success) {
          onEventAdd?.({
            type: "send_result",
            data: {
              message: `Message sent successfully! Delivered to ${result.sentCount} client(s)`,
              result,
            },
            timestamp: new Date().toISOString(),
          });
          setSendMessage("");
        } else {
          onEventAdd?.({
            type: "send_error",
            data: {
              message: `Send failed: ${result.error}`,
              result,
            },
            timestamp: new Date().toISOString(),
          });
        }
      } catch (error) {
        console.error("Error sending message:", error);
        onEventAdd?.({
          type: "send_error",
          data: {
            message: "Network error while sending message",
            error: error instanceof Error ? error.message : "Unknown error",
          },
          timestamp: new Date().toISOString(),
        });
      }
    },
    [sendMessage, sendTarget, sendTargetId],
  );

  return {
    sendTarget,
    setSendTarget,
    sendTargetId,
    setSendTargetId,
    sendMessage,
    setSendMessage,
    sendTestMessage,
  };
};
