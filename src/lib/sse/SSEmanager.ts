import type { Session } from "next-auth";

export type SSEClient = {
  userId: string;
  writer: WritableStreamDefaultWriter;
};

export interface SSEEvent {
  event?: string;
  data: unknown;
  id?: string;
  retry?: number;
}

export class Client {
  public session: Session;
  public clientId: string;
  public ticker: number;
  private stream: TransformStream;
  private writer: WritableStreamDefaultWriter;

  constructor(clientId: string, session: Session) {
    this.session = session;
    this.clientId = clientId;
    this.stream = new TransformStream();
    this.writer = this.stream.writable.getWriter();
    this.ping();
    this.ticker = setInterval(() => {
      this.ping();
    }, 10000) as unknown as number;
  }

  get readable() {
    return this.stream.readable;
  }

  writeData(event: SSEEvent) {
    this.writer.write(this.formatSSEMessage(event)).catch((e) => {
      console.log("Error sending SSE message:", e);
    });
  }

  private formatSSEMessage(event: SSEEvent): string {
    let message = "";

    if (event.event) {
      message += `event: ${event.event}\n`;
    }

    if (event.id) {
      message += `id: ${event.id}\n`;
    }

    if (event.retry) {
      message += `retry: ${event.retry}\n`;
    }

    const data =
      typeof event.data === "string" ? event.data : JSON.stringify(event.data);
    message += `data: ${data}\n\n`;

    return message;
  }

  ping() {
    const event: SSEEvent = {
      data: {
        timestamp: new Date().toISOString(),
        clientId: this.clientId,
      },
      event: "ping",
    };
    this.writeData(event);
  }
  close() {
    clearInterval(this.ticker);
  }
}

export const clients: Record<string, Client> = {};
