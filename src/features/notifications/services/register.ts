import { notificationManager } from "./manager";
import type { SSEModule } from "../types";

/**
 * Register a module to react to notification connection lifecycle events.
 * Returns a cleanup function to remove listeners.
 */
export function registerModule(mod: SSEModule) {
  const offConnect = notificationManager.on("connect", mod.connect);
  const offDisconnect = notificationManager.on("disconnect", mod.disconnect);
  
  return () => {
    offConnect();
    offDisconnect();
  };
}