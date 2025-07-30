import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { sseManager } from "../services/sse-manager";

// Mock ReadableStreamDefaultController
const mockController = {
  enqueue: vi.fn(),
  close: vi.fn(),
  signal: {
    addEventListener: vi.fn(),
  },
};

describe("SSE Manager", () => {
  beforeEach(() => {
    // Clear all clients before each test
    const stats = sseManager.getStats();
    for (let i = 0; i < stats.totalConnections; i++) {
      // This is a bit hacky but works for testing
      const clientIds = Array.from(sseManager["clients"].keys());
      if (clientIds.length > 0) {
        const clientId = clientIds[0];
        if (clientId) {
          sseManager.removeClient(clientId);
        }
      }
    }
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Clean up any remaining clients
    const stats = sseManager.getStats();
    for (let i = 0; i < stats.totalConnections; i++) {
      const clientIds = Array.from(sseManager["clients"].keys());
      if (clientIds.length > 0) {
        const clientId = clientIds[0];
        if (clientId) {
          sseManager.removeClient(clientId);
        }
      }
    }
  });

  describe("Client Management", () => {
    it("should add a client and return client ID", () => {
      const clientId = sseManager.addClient(mockController as any);

      expect(clientId).toBeDefined();
      expect(clientId).toMatch(/^client_\d+_[a-z0-9]+$/);

      const stats = sseManager.getStats();
      expect(stats.totalConnections).toBe(1);
      expect(stats.activeConnections).toBe(1);
    });

    it("should remove a client", () => {
      const clientId = sseManager.addClient(mockController as any);
      const removed = sseManager.removeClient(clientId);

      expect(removed).toBe(true);

      const stats = sseManager.getStats();
      expect(stats.totalConnections).toBe(0);
      expect(stats.activeConnections).toBe(0);
    });

    it("should handle removing non-existent client", () => {
      const removed = sseManager.removeClient("non-existent-id");
      expect(removed).toBe(false);
    });

    it("should track multiple clients", () => {
      const client1 = sseManager.addClient(mockController as any);
      const client2 = sseManager.addClient(mockController as any);

      const stats = sseManager.getStats();
      expect(stats.totalConnections).toBe(2);
      expect(stats.activeConnections).toBe(2);

      expect(client1).not.toBe(client2);
    });
  });

  describe("Message Sending", () => {
    it("should send message to specific client", () => {
      const clientId = sseManager.addClient(mockController as any);
      const message = { event: "test", data: { message: "Hello" } };

      const sent = sseManager.sendToClient(clientId, message);

      expect(sent).toBe(true);
      expect(mockController.enqueue).toHaveBeenCalledWith(
        expect.any(Uint8Array),
      );
    });

    it("should broadcast message to all clients", () => {
      const client1 = sseManager.addClient(mockController as any);
      const client2 = sseManager.addClient(mockController as any);

      // Clear the mock to ignore initial connection messages
      vi.clearAllMocks();

      const message = { event: "broadcast", data: { message: "Hello all" } };

      const sentCount = sseManager.broadcast(message);

      expect(sentCount).toBe(2);
      expect(mockController.enqueue).toHaveBeenCalledTimes(2);
    });

    it("should send message to specific user", () => {
      const clientId = sseManager.addClient(mockController as any, {
        userId: "user123",
      });
      const message = {
        event: "user_message",
        data: { message: "Hello user" },
      };

      const sentCount = sseManager.sendToUser("user123", message);

      expect(sentCount).toBe(1);
      expect(mockController.enqueue).toHaveBeenCalledWith(
        expect.any(Uint8Array),
      );
    });

    it("should send message to specific session", () => {
      const clientId = sseManager.addClient(mockController as any, {
        sessionId: "session456",
      });
      const message = {
        event: "session_message",
        data: { message: "Hello session" },
      };

      const sentCount = sseManager.sendToSession("session456", message);

      expect(sentCount).toBe(1);
      expect(mockController.enqueue).toHaveBeenCalledWith(
        expect.any(Uint8Array),
      );
    });
  });

  describe("Statistics", () => {
    it("should provide accurate statistics", () => {
      // Add clients with different user IDs
      sseManager.addClient(mockController as any, { userId: "user1" });
      sseManager.addClient(mockController as any, { userId: "user1" });
      sseManager.addClient(mockController as any, { userId: "user2" });
      sseManager.addClient(mockController as any, { sessionId: "session1" });

      const stats = sseManager.getStats();

      expect(stats.totalConnections).toBe(4);
      expect(stats.activeConnections).toBe(4);
      expect(stats.connectionsByUser).toEqual({
        user1: 2,
        user2: 1,
      });
      expect(stats.connectionsBySession).toEqual({
        session1: 1,
      });
    });

    it("should handle empty statistics", () => {
      const stats = sseManager.getStats();

      expect(stats.totalConnections).toBe(0);
      expect(stats.activeConnections).toBe(0);
      expect(stats.connectionsByUser).toEqual({});
      expect(stats.connectionsBySession).toEqual({});
    });
  });

  describe("Heartbeat", () => {
    it("should update client heartbeat", () => {
      const clientId = sseManager.addClient(mockController as any);
      const updated = sseManager.updateHeartbeat(clientId);

      expect(updated).toBe(true);
    });

    it("should handle heartbeat update for non-existent client", () => {
      const updated = sseManager.updateHeartbeat("non-existent-id");
      expect(updated).toBe(false);
    });
  });

  describe("Error Handling", () => {
    it("should handle controller errors gracefully", () => {
      const errorController = {
        ...mockController,
        enqueue: vi.fn().mockImplementation(() => {
          throw new Error("Controller error");
        }),
      };

      const clientId = sseManager.addClient(errorController as any);
      const message = { event: "test", data: { message: "Hello" } };

      const sent = sseManager.sendToClient(clientId, message);

      expect(sent).toBe(false);

      // Client should be removed after error
      const stats = sseManager.getStats();
      expect(stats.totalConnections).toBe(0);
    });
  });
});
