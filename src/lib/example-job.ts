/**
 * Example of how backend modules can push notifications without SSE protocol details.
 * Import sendEventToUser or broadcast from '@/lib/sse' and call them.
 */
import { sendEventToUser } from './sse';

export async function notifyUserExample(userId, payload) {
  // any backend code can call this
  sendEventToUser(userId, 'notification', payload);
}
