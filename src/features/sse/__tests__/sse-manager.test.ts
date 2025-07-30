import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { SSEManager } from "../services/sse-manager";
import type { SSEMessage } from "../types";

// Mock ReadableStreamDefaultController
const mockController = {
  enqueue: vi.fn(),
  close: vi.fn(),
} as any;

describe("SSEManager", () => {
  let manager: SSEManager;

  beforeEach(() => {
    manager = new SSEManager({
      heartbeatInterval: 100, // Short interval for testing
      cleanupInterval: 200,
      maxConnections: 10,
    });
  });

  afterEach(() => {
    manager.destroy();
  });

  describe("registerClient", () => {
    it("should register a client successfully", () => {
      const success = manager.registerClient("client1", mockController, {
        userId: "user1",
        sessionId: "session1",
      });

      expect(success).toBe(true);
      expect(manager.getStats().totalConnections).toBe(1);
    });

    it("should reject when max connections reached", () => {
      // Fill up connections
      for (let i = 0; i < 10; i++) {
        manager.registerClient(`client${i}`, mockController);
      }

      const success = manager.registerClient("client11", mockController);
      expect(success).toBe(false);
    });
  });

  describe("removeClient", () => {
    it("should remove a client successfully", () => {
      manager.registerClient("client1", mockController, {
        userId: "user1",
        sessionId: "session1",
      });

      expect(manager.getStats().totalConnections).toBe(1);

      manager.removeClient("client1");
      expect(manager.getStats().totalConnections).toBe(0);
    });

    it("should handle removing non-existent client", () => {
      expect(() => manager.removeClient("nonexistent")).not.toThrow();
    });
  });

  describe("sendMessage", () => {
    it("should send message to all clients", () => {
      manager.registerClient("client1", mockController);
      manager.registerClient("client2", mockController);

      const message: SSEMessage = {
        event: "test",
        data: { message: "hello" },
        target: "all",
      };

      manager.sendMessage(message);

      expect(mockController.enqueue).toHaveBeenCalledTimes(2);
    });

    it("should send message to specific user", () => {
      manager.registerClient("client1", mockController, { userId: "user1" });
      manager.registerClient("client2", mockController, { userId: "user2" });

      const message: SSEMessage = {
        event: "test",
        data: { message: "hello" },
        target: "user",
        targetId: "user1",
      };

      manager.sendMessage(message);

      expect(mockController.enqueue).toHaveBeenCalledTimes(1);
    });

    it("should send message to specific session", () => {
      manager.registerClient("client1", mockController, {
        sessionId: "session1",
      });
      manager.registerClient("client2", mockController, {
        sessionId: "session2",
      });

      const message: SSEMessage = {
        event: "test",
        data: { message: "hello" },
        target: "session",
        targetId: "session1",
      };

      manager.sendMessage(message);

      expect(mockController.enqueue).toHaveBeenCalledTimes(1);
    });

    it("should send message to specific client", () => {
      manager.registerClient("client1", mockController);
      manager.registerClient("client2", mockController);

      const message: SSEMessage = {
        event: "test",
        data: { message: "hello" },
        target: "client",
        targetId: "client1",
      };

      manager.sendMessage(message);

      expect(mockController.enqueue).toHaveBeenCalledTimes(1);
    });
  });

  describe("getStats", () => {
    it("should return correct statistics", () => {
      manager.registerClient("client1", mockController, { userId: "user1" });
      manager.registerClient("client2", mockController, { userId: "user1" });
      manager.registerClient("client3", mockController, {
        sessionId: "session1",
      });

      const stats = manager.getStats();

      expect(stats.totalConnections).toBe(3);
      expect(stats.userConnections).toBe(1); // 1 user with connections
      expect(stats.sessionConnections).toBe(1); // 1 session with connections
      expect(stats.maxConnections).toBe(10);
    });
  });

  describe("destroy", () => {
    it("should cleanup all resources", () => {
      manager.registerClient("client1", mockController);
      manager.registerClient("client2", mockController);

      expect(manager.getStats().totalConnections).toBe(2);

      manager.destroy();

      expect(manager.getStats().totalConnections).toBe(0);
      expect(mockController.close).toHaveBeenCalledTimes(2);
    });
  });
});
