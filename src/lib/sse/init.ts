import { setupMockEvents } from "./mock";

// TODO: make this better so it's not just in memory
let initialized = false;

/**
 * Register and start default SSE modules. Subsequent calls have no effect.
 */
export function initSSE() {
  if (initialized) return;
  initialized = true;
  setupMockEvents();
}
