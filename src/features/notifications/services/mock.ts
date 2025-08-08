import { notificationManager } from "./manager";
import { registerModule } from "./register";
import { NotificationType, type NotificationEvent, type TargetSelector } from "../types";

let selectTargets: TargetSelector = (clientIds) => {
  if (clientIds.length <= 1 || Math.random() < 0.5) {
    return clientIds; // broadcast
  }
  // send to a random client
  const id = clientIds[Math.floor(Math.random() * clientIds.length)];
  return id ? [id] : [];
};

export function configureTargetSelector(selector: TargetSelector) {
  selectTargets = selector;
}

let timeout: NodeJS.Timeout | null = null;

const MIN_DELAY_MS = 1 * 1000; // 1 second
const MAX_DELAY_MS = 3 * 1000; // 3 seconds

const schedule = () => {
  // random delay from MIN_DELAY_MS to MAX_DELAY_MS
  const delay =
    Math.floor(Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS + 1)) +
    MIN_DELAY_MS;
    
  timeout = setTimeout(() => {
    const ids = notificationManager.getClientIds();
    if (ids.length === 0) {
      stopMockEvents();
      return;
    }
    
    const targets = selectTargets(ids);
    const mockEvent: NotificationEvent = {
      type: NotificationType.Mock,
      text: `Random message at ${new Date().toISOString()}`,
      timestamp: Date.now(),
    };

    // depending on randomly aggregated targets, either broadcast to all
    // or send to specific target ids
    if (targets.length === ids.length) {
      notificationManager.broadcast("mock", mockEvent);
    } else {
      for (const id of targets) {
        const targetedEvent: NotificationEvent = {
          ...mockEvent,
          targetId: id,
        };
        notificationManager.send(id, "mock", targetedEvent);
      }
    }
    schedule();
  }, delay);
};

export const startMockEvents = () => {
  if (!timeout && notificationManager.getClientCount() > 0) {
    schedule();
  }
};

export const stopMockEvents = () => {
  if (timeout) {
    clearTimeout(timeout);
    timeout = null;
  }
};

/** 
 * Register listeners on the notification manager so mock events
 * automatically start when clients connect and stop when none remain. 
 */
export const setupMockEvents = () => {
  registerModule({
    connect: startMockEvents,
    disconnect: () => {
      if (notificationManager.getClientCount() === 0) {
        stopMockEvents();
      }
    },
  });
  
  if (notificationManager.getClientCount() > 0) {
    startMockEvents();
  }
};