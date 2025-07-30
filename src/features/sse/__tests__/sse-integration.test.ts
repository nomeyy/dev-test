import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  getSSEManager,
  cleanupSSEManager,
  broadcastSSE,
  sendSSEToUser,
} from "../index";

describe("SSE Integration", () => {
  beforeEach(() => {
    cleanupSSEManager();
  });

  afterEach(() => {
    cleanupSSEManager();
  });

  it("should export all necessary functions", () => {
    expect(getSSEManager).toBeDefined();
    expect(broadcastSSE).toBeDefined();
    expect(sendSSEToUser).toBeDefined();
    expect(cleanupSSEManager).toBeDefined();
  });

  it("should maintain singleton pattern", () => {
    const manager1 = getSSEManager();
    const manager2 = getSSEManager();

    expect(manager1).toBe(manager2);
  });

  it("should handle client lifecycle", () => {
    const manager = getSSEManager();

    // Initially no clients
    expect(manager.getClientCount()).toBe(0);

    // Add a client
    const mockClient = {
      id: "test-client",
      controller: { enqueue: () => {} } as any,
      abortController: { signal: { aborted: false }, abort: () => {} } as any,
      lastPing: Date.now(),
      isAlive: true,
    };

    manager.addClient(mockClient);
    expect(manager.getClientCount()).toBe(1);

    // Remove the client
    manager.removeClient("test-client");
    expect(manager.getClientCount()).toBe(0);
  });

  it("should handle utility functions", () => {
    const manager = getSSEManager();

    // Test broadcast function
    expect(() => broadcastSSE("test_event", { message: "test" })).not.toThrow();

    // Test sendToUser function
    expect(() =>
      sendSSEToUser("user123", "test_event", { message: "test" }),
    ).not.toThrow();
  });
});
