import { SSEManager } from "./sse-manager";

export const getSSEManager = () => {
  return SSEManager.getInstance({
    heartbeatInterval: 30000, //30 seconds
    cleanupInterval: 30000, //30 seconds
  });
}