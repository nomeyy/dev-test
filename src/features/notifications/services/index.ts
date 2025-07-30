import { EventEmitter, on } from "node:events";
import { NotificationType, type NotificationEvent } from "../types";

export interface NotificationEvents {
  notify: [subIds: string[], payload: NotificationEvent];
}

class IterableEventEmitter extends EventEmitter<NotificationEvents> {
  toIterable<TEventName extends keyof NotificationEvents>(
    eventName: TEventName,
    opts?: NonNullable<Parameters<typeof on>[2]>,
  ): AsyncIterable<NotificationEvents[TEventName]> {
    return on(this, eventName, opts) as AsyncIterable<
      NotificationEvents[TEventName]
    >;
  }
}

export const ee = new IterableEventEmitter();
// use the in-memore set to track subscribers for simplicity
// in a real application, you would use a database or other persistent storage
const clients = new Set<string>();

export const notificationsService = {
  subscribe: (id: string) => {
    clients.add(id);
    ee.emit("notify", [], {
      type: NotificationType.NewSub,
      subId: id,
    });
  },
  unsubscribe: (id: string) => {
    clients.delete(id);
    ee.emit("notify", [], {
      type: NotificationType.Unsub,
      subId: id,
    });
  },
  notify: (subIds: string[], message?: string) => {
    ee.emit("notify", subIds, {
      type: NotificationType.Ping,
      message,
    });
  },
  on: async function* <TEventName extends keyof NotificationEvents, T>(
    eventName: TEventName,
    signal: AbortSignal | undefined,
    processor: (data: NotificationEvents[TEventName]) => T,
  ) {
    const iterable = ee.toIterable(eventName, { signal });

    for await (const eventData of iterable) {
      yield processor(eventData);
    }
  },
} as const;
