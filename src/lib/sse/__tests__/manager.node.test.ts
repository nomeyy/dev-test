import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { sseManager } from "../manager";
import type { ReadableStreamDefaultController } from "stream/web";

// Mock the service context
vi.mock("@/utils/service-utils", () => ({
  createServiceContext: () => ({
    log: {
      info: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    },
    handleError: vi.fn(),
  }),
}));

describe("SSE Manager", () => {
  let mockController: ReadableStreamDefaultController;

  beforeEach(() => {
    // Reset the manager state
    sseManager.reset();

    // Create a fresh manager instance for each test
    mockController = {
      enqueue: vi.fn(),
      close: vi.fn(),
      error: vi.fn(),
    } as unknown as ReadableStreamDefaultController;
  });

  afterEach(() => {
    // Clean up after each test
    sseManager.reset();
  });

  describe("registerClient", () => {
    it("should register a new client successfully", () => {
      const client = sseManager.registerClient(
        "user-123",
        "client-456",
        mockController,
      );

      expect(client.userId).toBe("user-123");
      expect(client.clientId).toBe("client-456");
      expect(client.controller).toBe(mockController);
      expect(client.connectedAt).toBeInstanceOf(Date);
      expect(client.lastActivity).toBeInstanceOf(Date);
    });

    it("should allow multiple clients for the same user", () => {
      const client1 = sseManager.registerClient(
        "user-123",
        "client-456",
        mockController,
      );
      const client2 = sseManager.registerClient(
        "user-123",
        "client-789",
        mockController,
      );

      expect(client1.clientId).toBe("client-456");
      expect(client2.clientId).toBe("client-789");
      expect(sseManager.getConnectionCount()).toBe(2);
    });

    it("should track connection count correctly", () => {
      expect(sseManager.getConnectionCount()).toBe(0);

      sseManager.registerClient("user-123", "client-456", mockController);
      expect(sseManager.getConnectionCount()).toBe(1);

      sseManager.registerClient("user-456", "client-789", mockController);
      expect(sseManager.getConnectionCount()).toBe(2);
    });
  });

  describe("removeClient", () => {
    it("should remove a client successfully", () => {
      sseManager.registerClient("user-123", "client-456", mockController);
      expect(sseManager.getConnectionCount()).toBe(1);

      const removed = sseManager.removeClient("user-123", "client-456");
      expect(removed).toBe(true);
      expect(sseManager.getConnectionCount()).toBe(0);
    });

    it("should return false when removing non-existent client", () => {
      const removed = sseManager.removeClient("user-123", "client-456");
      expect(removed).toBe(false);
    });

    it("should handle removing client from user with multiple connections", () => {
      sseManager.registerClient("user-123", "client-456", mockController);
      sseManager.registerClient("user-123", "client-789", mockController);
      expect(sseManager.getConnectionCount()).toBe(2);

      const removed = sseManager.removeClient("user-123", "client-456");
      expect(removed).toBe(true);
      expect(sseManager.getConnectionCount()).toBe(1);
    });
  });

  describe("sendToUser", () => {
    it("should send event to user successfully", async () => {
      sseManager.registerClient("user-123", "client-456", mockController);

      await sseManager.sendToUser("user-123", "notification", {
        timestamp: new Date().toISOString(),
        message: "Test message",
      });

      expect(mockController.enqueue).toHaveBeenCalledWith(
        expect.any(Uint8Array),
      );
    });

    it("should send event to all user connections", async () => {
      sseManager.registerClient("user-123", "client-456", mockController);
      sseManager.registerClient("user-123", "client-789", mockController);

      await sseManager.sendToUser("user-123", "notification", {
        timestamp: new Date().toISOString(),
        message: "Test message",
      });

      expect(mockController.enqueue).toHaveBeenCalledTimes(2);
    });

    it("should handle sending to user with no connections", async () => {
      await expect(
        sseManager.sendToUser("user-123", "notification", {
          timestamp: new Date().toISOString(),
          message: "Test message",
        }),
      ).resolves.not.toThrow();
    });

    it("should handle controller errors gracefully", async () => {
      const errorController = {
        ...mockController,
        enqueue: vi.fn().mockImplementation(() => {
          throw new Error("Controller error");
        }),
      };

      sseManager.registerClient("user-123", "client-456", errorController);

      await sseManager.sendToUser("user-123", "notification", {
        timestamp: new Date().toISOString(),
        message: "Test message",
      });

      // Should remove the problematic client
      expect(sseManager.getConnectionCount()).toBe(0);
    });
  });

  describe("broadcast", () => {
    it("should broadcast event to all connected clients", async () => {
      sseManager.registerClient("user-123", "client-456", mockController);
      sseManager.registerClient("user-456", "client-789", mockController);

      await sseManager.broadcast("notification", {
        timestamp: new Date().toISOString(),
        message: "Broadcast message",
      });

      expect(mockController.enqueue).toHaveBeenCalledTimes(2);
    });

    it("should handle empty broadcast gracefully", async () => {
      await expect(
        sseManager.broadcast("notification", {
          timestamp: new Date().toISOString(),
          message: "Broadcast message",
        }),
      ).resolves.not.toThrow();
    });
  });

  describe("sendEvent", () => {
    it("should send event to specific users", async () => {
      sseManager.registerClient("user-123", "client-456", mockController);

      await sseManager.sendEvent({
        eventType: "notification",
        data: {
          timestamp: new Date().toISOString(),
          message: "Test message",
        },
        targetUsers: ["user-123"],
      });

      expect(mockController.enqueue).toHaveBeenCalled();
    });

    it("should broadcast when broadcast flag is true", async () => {
      sseManager.registerClient("user-123", "client-456", mockController);

      await sseManager.sendEvent({
        eventType: "notification",
        data: {
          timestamp: new Date().toISOString(),
          message: "Test message",
        },
        broadcast: true,
      });

      expect(mockController.enqueue).toHaveBeenCalled();
    });

    it("should handle no target specified", async () => {
      await expect(
        sseManager.sendEvent({
          eventType: "notification",
          data: {
            timestamp: new Date().toISOString(),
            message: "Test message",
          },
        }),
      ).resolves.not.toThrow();
    });
  });

  describe("getActiveConnections", () => {
    it("should return active connections map", () => {
      sseManager.registerClient("user-123", "client-456", mockController);
      sseManager.registerClient("user-456", "client-789", mockController);

      const connections = sseManager.getActiveConnections();
      expect(connections.size).toBe(2);
      expect(connections.get("user-123")).toHaveLength(1);
      expect(connections.get("user-456")).toHaveLength(1);
    });
  });

  describe("getConnectionCount", () => {
    it("should return correct connection count", () => {
      expect(sseManager.getConnectionCount()).toBe(0);

      sseManager.registerClient("user-123", "client-456", mockController);
      expect(sseManager.getConnectionCount()).toBe(1);

      sseManager.registerClient("user-123", "client-789", mockController);
      expect(sseManager.getConnectionCount()).toBe(2);

      sseManager.registerClient("user-456", "client-abc", mockController);
      expect(sseManager.getConnectionCount()).toBe(3);
    });
  });

  describe("cleanup", () => {
    it("should clean up resources", () => {
      sseManager.registerClient("user-123", "client-456", mockController);
      expect(sseManager.getConnectionCount()).toBe(1);

      sseManager.cleanup();

      expect(sseManager.getConnectionCount()).toBe(1);
    });
  });

  describe("reset", () => {
    it("should reset manager state completely", () => {
      sseManager.registerClient("user-123", "client-456", mockController);
      sseManager.registerClient("user-456", "client-789", mockController);
      expect(sseManager.getConnectionCount()).toBe(2);

      sseManager.reset();
      expect(sseManager.getConnectionCount()).toBe(0);
      expect(sseManager.getActiveConnections().size).toBe(0);
    });
  });
});
