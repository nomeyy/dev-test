import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { SSEManager } from "../services/sse-manager";
import type { SSEEvent, SSEManagerConfig } from "../types";

// Mock logger to avoid console output during tests
vi.mock("@/utils/logging", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe("SSEManager", () => {
  let manager: SSEManager;
  let config: SSEManagerConfig;

  beforeEach(() => {
    config = {
      pingInterval: 100, // Short interval for tests
      clientTimeout: 200,
      maxClients: 5,
      enableLogging: false,
    };
    manager = new SSEManager(config);
  });

  afterEach(() => {
    manager.destroy();
  });

  describe("Connection Management", () => {
    it("should create a new connection", () => {
      const response = manager.createConnection({
        userId: "test-user",
        sessionId: "test-session",
      });

      expect(response).toBeInstanceOf(Response);
      expect(response.headers.get("Content-Type")).toBe("text/event-stream");
      expect(response.headers.get("Cache-Control")).toBe("no-cache");
    });

    it("should track connection stats", () => {
      manager.createConnection({ userId: "user1" });
      manager.createConnection({ userId: "user1" });
      manager.createConnection({ userId: "user2" });

      const stats = manager.getStats();

      expect(stats.totalClients).toBe(3);
      expect(stats.clientsByUser.user1).toBe(2);
      expect(stats.clientsByUser.user2).toBe(1);
      expect(stats.totalEventsSent).toBeGreaterThan(0); // Connected events
    });

    it("should enforce max client limit", () => {
      // Create max clients
      for (let i = 0; i < config.maxClients!; i++) {
        manager.createConnection({ userId: `user${i}` });
      }

      // Should throw when exceeding limit
      expect(() => {
        manager.createConnection({ userId: "overflow" });
      }).toThrow("Maximum number of SSE clients reached");
    });
  });

  describe("Event Broadcasting", () => {
    let clientCount: number;

    beforeEach(() => {
      // Create test clients
      manager.createConnection({ userId: "user1" });
      manager.createConnection({ userId: "user1" });
      manager.createConnection({ userId: "user2" });
      clientCount = 3;
    });

    it("should broadcast to all clients", () => {
      const event: SSEEvent = {
        event: "test",
        data: { message: "broadcast test" },
      };

      const sentCount = manager.broadcast(event);
      expect(sentCount).toBe(clientCount);
    });

    it("should send to specific user", () => {
      const event: SSEEvent = {
        event: "test",
        data: { message: "user test" },
      };

      const sentCount = manager.sendToUser("user1", event);
      expect(sentCount).toBe(2); // user1 has 2 connections
    });

    it("should filter clients correctly", () => {
      manager.createConnection({
        userId: "user3",
        sessionId: "session1",
        metadata: { role: "admin" },
      });

      const event: SSEEvent = {
        event: "admin",
        data: { message: "admin only" },
      };

      // Send to admin role only
      const sentCount = manager.sendToClients(
        { metadata: { role: "admin" } },
        event,
      );

      expect(sentCount).toBe(1);
    });
  });

  describe("Event Formatting", () => {
    it("should format SSE messages correctly", () => {
      const response = manager.createConnection({ userId: "test" });
      const stream = response.body;

      expect(stream).toBeInstanceOf(ReadableStream);
    });

    it("should handle multiline data", () => {
      manager.createConnection({ userId: "test" });

      const event: SSEEvent = {
        event: "multiline",
        data: "line1\nline2\nline3",
      };

      const sentCount = manager.broadcast(event);
      expect(sentCount).toBe(1);
    });

    it("should handle complex JSON data", () => {
      manager.createConnection({ userId: "test" });

      const event: SSEEvent = {
        event: "complex",
        data: {
          nested: { object: true },
          array: [1, 2, 3],
          string: "test",
          number: 42,
        },
      };

      const sentCount = manager.broadcast(event);
      expect(sentCount).toBe(1);
    });
  });

  describe("Client Lifecycle", () => {
    it("should disconnect specific clients", () => {
      const response1 = manager.createConnection({ userId: "user1" });
      const response2 = manager.createConnection({ userId: "user2" });

      let stats = manager.getStats();
      expect(stats.totalClients).toBe(2);

      // Get client IDs from the internal state (this is a bit hacky for testing)
      const clientIds = Object.keys((manager as any).clients);
      expect(clientIds.length).toBeGreaterThan(0);

      const disconnected = manager.disconnectClient(clientIds[0]!);

      expect(disconnected).toBe(true);

      stats = manager.getStats();
      expect(stats.totalClients).toBe(1);
    });

    it("should disconnect all clients for a user", () => {
      manager.createConnection({ userId: "user1" });
      manager.createConnection({ userId: "user1" });
      manager.createConnection({ userId: "user2" });

      const disconnectedCount = manager.disconnectUser("user1");
      expect(disconnectedCount).toBe(2);

      const stats = manager.getStats();
      expect(stats.totalClients).toBe(1);
      expect(stats.clientsByUser.user1).toBeUndefined();
    });
  });

  describe("Heartbeat and Cleanup", () => {
    it("should send heartbeat messages", async () => {
      manager.createConnection({ userId: "test" });

      // Wait for heartbeat interval
      await new Promise((resolve) => setTimeout(resolve, 150));

      const stats = manager.getStats();
      expect(stats.totalEventsSent).toBeGreaterThan(1); // Connected + ping events
    });

    it("should clean up stale clients", async () => {
      // Create a connection
      manager.createConnection({ userId: "test" });

      let stats = manager.getStats();
      expect(stats.totalClients).toBe(1);

      // Wait for client timeout + cleanup interval
      await new Promise((resolve) => setTimeout(resolve, 350));

      stats = manager.getStats();
      expect(stats.totalClients).toBe(0); // Should be cleaned up
    });
  });

  describe("Error Handling", () => {
    it("should handle send errors gracefully", () => {
      // Create connection then simulate error by closing controller
      const response = manager.createConnection({ userId: "test" });
      const clientIds = Object.keys((manager as any).clients);
      expect(clientIds.length).toBeGreaterThan(0);

      const client = (manager as any).clients[clientIds[0]!];

      // Close the controller to simulate error
      client.controller.close();

      const event: SSEEvent = {
        event: "test",
        data: { message: "should fail" },
      };

      const sentCount = manager.sendToClient(clientIds[0]!, event);
      expect(sentCount).toBe(false);

      // Client should be automatically disconnected
      const stats = manager.getStats();
      expect(stats.totalClients).toBe(0);
    });

    it("should handle non-existent client sends", () => {
      const event: SSEEvent = {
        event: "test",
        data: { message: "no client" },
      };

      const sent = manager.sendToClient("non-existent", event);
      expect(sent).toBe(false);
    });
  });

  describe("Manager Destruction", () => {
    it("should clean up all resources on destroy", () => {
      manager.createConnection({ userId: "user1" });
      manager.createConnection({ userId: "user2" });

      let stats = manager.getStats();
      expect(stats.totalClients).toBe(2);

      manager.destroy();

      stats = manager.getStats();
      expect(stats.totalClients).toBe(0);
    });
  });
});
