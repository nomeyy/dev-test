/**
 * Sends a demo SSE event by calling the backend API.
 * Can be extended for more event types.
 */
/**
 * Sends an SSE event by calling the backend API with id and event.
 */
export async function sendDemoEvent(id: string | null, event: string) {
  await fetch(`/api/sse-demo?id=${id}&event=${encodeURIComponent(event)}`);
}
