import { sseManager } from "./SSEManager";

export const registerConnection =
  sseManager.registerConnection.bind(sseManager);
export const sendSSEEvent = sseManager.sendEvent.bind(sseManager);
export const broadcastSSEEvent = sseManager.broadcastEvent.bind(sseManager);
export const getSSEStats = sseManager.getStats.bind(sseManager);
