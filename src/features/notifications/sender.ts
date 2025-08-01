import { sseManager } from "./sseManager";

export function notifyUser(userId: string, eventName: string, payload: any) {
  sseManager.sendEvent(userId, eventName, payload);
}

export function notifyUsers(userIds: string[], eventName: string, payload: any) {
  userIds.forEach((id) => sseManager.sendEvent(id, eventName, payload));
}

export function broadcast(eventName: string, payload: any) {
  sseManager.broadcastEvent(eventName, payload);
}

export function listConnections() {
  sseManager.listConnections();
}