import { sseManager } from "./sse-manager";

export const sendSSEToUser = (userId: string, event: string, data: any) => {
  try {
    sseManager.sendToUser(userId, event, data);
  } catch (e) {
    console.error("❌ Failed to send SSE to user:", userId, e);
  }
};

export const broadcastSSE = (event: string, data: any) => {
  try {
    sseManager.broadcast(event, data);
  } catch (e) {
    console.error("❌ Failed to broadcast SSE:", event, e);
  }
};
