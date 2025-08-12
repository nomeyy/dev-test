/**
 * SSE Manager - function based (TypeScript safe)
 *
 * Exposes:
 * - createEventStream(userId): returns { stream, close }
 * - sendEventToUser(userId, eventName, payload)
 * - broadcast(eventName, payload)
 * - getClientCount()
 * - startHeartbeat(), stopHeartbeat()
 */

const clients = new Map<string, Set<WritableStreamDefaultWriter<string>>>();

/** Internal: write a raw string to a stream's writer safely */
function safeWrite(writer: WritableStreamDefaultWriter<string>, str: string) {
  try {
    writer.write(str);
  } catch (e) {
    console.error("SSE write error", e);
  }
}

/** Create a ReadableStream that will be used for SSE connection */
export function createEventStream(userId: string) {
  const ts = new TransformStream<string>();
  const writer = ts.writable.getWriter();

  // Save this writer for the user
  if (!clients.has(userId)) clients.set(userId, new Set());
  clients.get(userId)!.add(writer);

  // Send a "connected" event
  safeWrite(
    writer,
    `event: connected\ndata: ${JSON.stringify({ message: "connected" })}\n\n`
  );

  const stream = ts.readable;

  // create a close function to cleanup writers for this connection
  const close = () => {
    const set = clients.get(userId);
    if (!set) return;
    for (const w of Array.from(set)) {
      try {
        w.close();
      } catch {}
      set.delete(w);
    }
    if (set.size === 0) clients.delete(userId);
  };

  return { stream, close };
}

/** Format SSE message */
function formatSSE(eventName: string, data: unknown) {
  return `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
}

/** Send to a single user */
export function sendEventToUser(
  userId: string,
  eventName: string,
  payload: unknown
) {
  const set = clients.get(userId);
  if (!set) return { sent: 0 };
  let sent = 0;
  for (const writer of Array.from(set)) {
    try {
      safeWrite(writer, formatSSE(eventName, payload));
      sent++;
    } catch (e) {
      console.error("Failed to send to writer", e);
      try {
        writer.close();
      } catch {}
      set.delete(writer);
    }
  }
  if (set.size === 0) clients.delete(userId);
  return { sent };
}

/** Broadcast to all connected clients */
export function broadcast(eventName: string, payload: unknown) {
  let total = 0;
  for (const [userId, set] of clients.entries()) {
    for (const writer of Array.from(set)) {
      try {
        safeWrite(writer, formatSSE(eventName, payload));
        total++;
      } catch (e) {
        console.error("Broadcast write error", e);
        try {
          writer.close();
        } catch {}
        set.delete(writer);
      }
    }
    if (set.size === 0) clients.delete(userId);
  }
  return { total };
}

/** Simple utility to return number of connected clients */
export function getClientCount() {
  let total = 0;
  for (const set of clients.values()) total += set.size;
  return total;
}

/** Heartbeat mechanism: periodically send a comment ping to keep proxies alive */
let heartbeatInterval: ReturnType<typeof setInterval> | undefined;
export function startHeartbeat() {
  if (heartbeatInterval) return;
  heartbeatInterval = setInterval(() => {
    for (const set of clients.values()) {
      for (const writer of Array.from(set)) {
        try {
          safeWrite(writer, `: ping\n\n`);
        } catch {
          try {
            writer.close();
          } catch {}
          set.delete(writer);
        }
      }
    }
  }, 20_000); // 20 seconds
}

export function stopHeartbeat() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = undefined;
  }
}
