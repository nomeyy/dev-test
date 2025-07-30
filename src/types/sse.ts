export type SSEEventType =
  | "connected"
  | "clients"
  | "client-connect"
  | "client-disconnect"
  | "broadcast"
  | "ping";

export interface SSEClient {
  id: string;
  controller: ReadableStreamDefaultController;
  userId?: string;
}

export interface SSEWriter {
  write: (data: string) => void | Promise<void>;
  close: () => void | Promise<void>;
}

export type TSSEClient = {
  id: string;
  writer: SSEWriter;
  userId?: string;
};

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

export interface EventConfig {
  label: string;
  color: string;
  iconType: string;
  bubbleClass: string;
}

export interface BroadcastEventData {
  message?: string;
  clientId?: string;
  id?: string;
}

export interface HomeMessageConfig {
  label: string;
  color: string;
  iconType: string;
  bubbleClass: string;
}

export type LogEntry =
  | { type: "status"; text: string; timestamp: number }
  | {
      type: "broadcast";
      message: string;
      isTargeted: boolean;
      timestamp: number;
    };

export interface HeartbeatProps {
  heartbeatKey: React.Key;
  className?: string;
}
