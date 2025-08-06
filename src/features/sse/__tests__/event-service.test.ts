import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { EventService } from "../services/event-service";
import type { SSEEvent, SSEConfig } from "../types";

vi.mock("@/utils/logging", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

describe("EventService", () => {
  let service: EventService;
  const config: SSEConfig = {
    pingInterval: 100,
    clientTimeout: 200,
    maxClients: 5,
    enableLogging: false,
  };

  beforeEach(() => {
    vi.useFakeTimers(); // Enable fake timers
    service = new EventService(config);
  });

  afterEach(() => {
    service.destroy();
    vi.runOnlyPendingTimers(); // Run any pending timers to clean up
    vi.useRealTimers(); // Restore real timers after each test
  });

  it("should create a connection", () => {
    const response = service.createConnection({ userId: "test-user" });
    expect(response).toBeInstanceOf(Response);
    expect(response.headers.get("Content-Type")).toBe("text/event-stream");
  });

  it("should broadcast to all clients", () => {
    service.createConnection({ userId: "user1" });
    service.createConnection({ userId: "user2" });
    const event: SSEEvent = { event: "test", data: { message: "test" } };
    const count = service.broadcast(event);
    expect(count).toBe(2);
  });

  it("should filter clients by userId", () => {
    service.createConnection({ userId: "user1" });
    service.createConnection({ userId: "user2" });
    const clients = service.getClientsByFilter({ userId: "user1" });
    expect(clients.length).toBe(1);
  });
});
