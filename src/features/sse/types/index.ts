export type SSEEventType =
  | "connected"
  | "clients"
  | "client-connect"
  | "client-disconnect"
  | "broadcast"
  | "ping";

export interface ConnectedEvent {
  event: "connected";
  data: { id: string };
}

export interface ClientsEvent {
  event: "clients";
  data: { clients: string[] };
}

export interface ClientConnectEvent {
  event: "client-connect";
  data: { id: string };
}

export interface ClientDisconnectEvent {
  event: "client-disconnect";
  data: { id: string };
}

export interface BroadcastEvent {
  event: "broadcast";
  data: { message: string; clientId?: string };
}

export interface PingEvent {
  event: "ping";
  data: object;
}

export type SSEEvent =
  | ConnectedEvent
  | ClientsEvent
  | ClientConnectEvent
  | ClientDisconnectEvent
  | BroadcastEvent
  | PingEvent;
