import { SSE_HEARTBEAT_INTERVAL } from "./constants";
import type { SseEvent } from "./events";

const channels = new Map<string, Set<ReadableStreamDefaultController>>();
const encoder = new TextEncoder();

function getChannel(channel: string): Set<ReadableStreamDefaultController> {
  if (!channels.has(channel)) {
    channels.set(channel, new Set());
  }
  return channels.get(channel)!;
}

export const SseService = {
  addClient(channel: string, controller: ReadableStreamDefaultController) {
    const clients = getChannel(channel);
    clients.add(controller);
    console.log(
      `SSE: Client added to channel: ${channel}. Total clients in channel: ${clients.size}`,
    );
  },

  removeClient(channel: string, controller: ReadableStreamDefaultController) {
    const clients = getChannel(channel);
    clients.delete(controller);
    console.log(
      `SSE: Client removed from channel: ${channel}. Total clients in channel: ${clients.size}`,
    );

    if (clients.size === 0) {
      channels.delete(channel);
      console.log(`SSE: Channel ${channel} is now empty and has been removed.`);
    }
  },

  send(channel: string, event: SseEvent) {
    const clients = getChannel(channel);
    if (clients.size === 0) return; // No clients to send to

    console.log(
      `SSE: Sending event "${event.name}" to channel "${channel}" (${clients.size} clients)`,
    );
    const payload = `data: ${JSON.stringify(event)}\n\n`;
    const chunk = encoder.encode(payload);

    clients.forEach((controller) => {
      try {
        controller.enqueue(chunk);
      } catch (error) {
        console.log(
          `SSE: Failed to send to a client in channel ${channel}, removing client.`,
        );
        this.removeClient(channel, controller);
      }
    });
  },

  broadcast(channels: string[], event: SseEvent) {
    console.log(
      `SSE: Broadcasting event "${event.name}" to channels:`,
      channels,
    );
    channels.forEach((channel) => this.send(channel, event));
  },

  startHeartbeat(channel: string, controller: ReadableStreamDefaultController) {
    const heartbeat = () => {
      // Check if client is still connected before sending a heartbeat
      if (getChannel(channel).has(controller)) {
        this.send(channel, { name: "ping", data: {} });
      }
    };
    return setInterval(heartbeat, SSE_HEARTBEAT_INTERVAL);
  },
};
