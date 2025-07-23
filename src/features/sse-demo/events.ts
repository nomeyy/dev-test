/**
 * Sends a demo SSE event by calling the backend API.
 * Can be extended for more event types.
 */
export async function sendDemoEvent() {
  await fetch("/api/sse-demo");
}
