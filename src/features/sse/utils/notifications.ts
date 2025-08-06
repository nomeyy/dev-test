import { EventService } from "../services/event-service";
import type { SSEEvent, ClientFilter, SSEConfig, SSEClient } from "../types";

let eventService: EventService | null = null;

export function initializeSSE(config?: SSEConfig): EventService {
  if (eventService) eventService.destroy();
  eventService = new EventService(config);
  return eventService;
}

export function getEventService(): EventService {
  if (!eventService) eventService = new EventService();
  return eventService;
}

export function notifyUser<T>(userId: string, event: SSEEvent<T>): number {
  return getEventService().sendToUser(userId, event);
}

export function broadcast<T>(event: SSEEvent<T>): number {
  return getEventService().broadcast(event);
}

export function notifyFiltered<T>(
  filter: ClientFilter,
  event: SSEEvent<T>,
): number {
  return getEventService().sendToClients(filter, event);
}

export function getActiveClients(filter: ClientFilter = {}): SSEClient[] {
  return getEventService().getClientsByFilter(filter);
}

export function notifyWithMetadata<T>(
  metadata: Record<string, string>,
  event: SSEEvent<T>,
): number {
  return getEventService().sendToClients({ metadata }, event);
}

export function cleanupSSE(): void {
  if (eventService) {
    eventService.destroy();
    eventService = null;
  }
}
