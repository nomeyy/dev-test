import { sseManager } from "./manager";
import { registerModule } from "./register";
import { notifyAll, notifyClient } from "./notify";

export type TargetSelector = (clientIds: string[]) => string[];

let selectTargets: TargetSelector = (clientIds) => {
  if (clientIds.length <= 1 || Math.random() < 0.5) {
    return clientIds; // broadcast
  }
  // send to a random client
  // TODO: this can be changed to send to a specific clientId (userId / sessionId) as well
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
    const ids = sseManager.getClientIds();
    if (ids.length === 0) {
      stopMockEvents();
      return;
    }
    const targets = selectTargets(ids);
    const message = { text: `Random message at ${new Date().toISOString()}` };

    // depending on randomly aggrecated targets, either broadcast to all
    // or send to a specific target id
    if (targets.length === ids.length) {
      notifyAll("mock", message);
    } else {
      for (const id of targets) {
        notifyClient(id, "mock", { ...message, targetId: id });
      }
    }
    schedule();
  }, delay);
};

export const startMockEvents = () => {
  if (!timeout && sseManager.getClientCount() > 0) {
    schedule();
  }
};

export const stopMockEvents = () => {
  if (timeout) {
    clearTimeout(timeout);
    timeout = null;
  }
};

/** Register listeners on the SSE manager so mock events
 * automatically start when clients connect and stop when none remain. */
export const setupMockEvents = () => {
  registerModule({
    connect: startMockEvents,
    disconnect: () => {
      if (sseManager.getClientCount() === 0) {
        stopMockEvents();
      }
    },
  });
  if (sseManager.getClientCount() > 0) {
    startMockEvents();
  }
};
