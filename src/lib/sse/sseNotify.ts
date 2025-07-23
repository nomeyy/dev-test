import { sseManager } from "./sse";

export function notifyClient(id: string, event: string, payload: any) {
  sseManager.sendEvent(id, event, payload);
}

export function notifyAll(event: string, payload: any) {
  sseManager.broadcast(event, payload);
}
