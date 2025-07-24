import { SSEManager } from "./sse-manager";

export const getSSEManager = () => {
  return SSEManager.getInstance({
    heartbeatInterval: 10000,
    cleanupInterval: 30000,
  });
}