export interface SSEModule {
  connect: (clientId: string) => void;
  disconnect: (clientId: string) => void;
}

import { sseManager } from "./manager";

/**
 * Register a module to react to SSE connection lifecycle events.
 * Returns a cleanup function to remove listeners.
 */
export function registerModule(mod: SSEModule) {
  const offConnect = sseManager.on("connect", mod.connect);
  const offDisconnect = sseManager.on("disconnect", mod.disconnect);
  return () => {
    offConnect();
    offDisconnect();
  };
}
