export interface SSEEvent {
  event: string;
  data: Record<string, unknown>;
}
