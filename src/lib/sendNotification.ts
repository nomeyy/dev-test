import { sseManager } from "./sseManager";


export function sendTestNotification() {
  sseManager.broadcast('notification', { message: 'Hello from SSE!' });
}