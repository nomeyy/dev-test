import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { SSEManager } from "../services/sse-manager";
import type { SSEClient } from "../types";

// Mock Redis
vi.mock("@/lib/redis", () => ({
  getRedis: vi.fn().mockResolvedValue({
    lpush: vi.fn(),
    lrange: vi.fn().mockResolvedValue([]),
  }),
}));

// Mock logger
vi.mock("@/utils/logging", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

describe("SSEManager", () => {
  let manager: SSEManager;
  let mockClient: SSEClient;

  beforeEach(() => {
    manager = new SSEManager({
      heartbeatInterval: 1000,
      maxConnections: 10,
      enableRedis: false,
    });

    mockClient = {
      id: "test-client-1",
      userId: "test-user-1",
      sessionId: "test-session-1",
      headers: new Headers(),
      send: vi.fn(),
      close: vi.fn(),
      isConnected: true,
      lastActivity: Date.now(),
      metadata: { test: true },
    };
  });

  afterEach(() => {
    manager.disconnect();
  });

  describe("addClient", () => {
    it("should add a client successfully", async () => {
      await manager.addClient(mockClient);

      const stats = manager.getStats();
      expect(stats.totalConnections).toBe(1);
      expect(stats.activeConnections).toBe(1);
    });

    it("should throw error when max connections reached", async () => {
      const smallManager = new SSEManager({ maxConnections: 1 });

      await smallManager.addClient(mockClient);

      const secondClient = { ...mockClient, id: "test-client-2" };
      await expect(smallManager.addClient(secondClient)).rejects.toThrow(
        "Maximum connections reached",
      );
    });
  });

  describe("removeClient", () => {
    it("should remove a client successfully", async () => {
      await manager.addClient(mockClient);
      manager.removeClient(mockClient.id);

      const stats = manager.getStats();
      expect(stats.totalConnections).toBe(0);
      expect(stats.activeConnections).toBe(0);
    });

    it("should handle removing non-existent client", () => {
      expect(() => manager.removeClient("non-existent")).not.toThrow();
    });
  });

  describe("sendToClient", () => {
    it("should send event to specific client", async () => {
      await manager.addClient(mockClient);

      const result = await manager.sendToClient(mockClient.id, "test-event", {
        data: "test",
      });

      expect(result).toBe(true);
      expect(mockClient.send).toHaveBeenCalledWith(
        expect.stringContaining("test-event"),
      );
    });

    it("should return false for non-existent client", async () => {
      const result = await manager.sendToClient("non-existent", "test-event", {
        data: "test",
      });
      expect(result).toBe(false);
    });
  });

  describe("sendToUser", () => {
    it("should send event to all clients of a user", async () => {
      const client1 = { ...mockClient, id: "client-1" };
      const client2 = { ...mockClient, id: "client-2" };

      await manager.addClient(client1);
      await manager.addClient(client2);

      const result = await manager.sendToUser("test-user-1", "test-event", {
        data: "test",
      });

      expect(result).toBe(2);
      expect(client1.send).toHaveBeenCalledWith(
        expect.stringContaining("test-event"),
      );
      expect(client2.send).toHaveBeenCalledWith(
        expect.stringContaining("test-event"),
      );
    });

    it("should return 0 for user with no connections", async () => {
      const result = await manager.sendToUser(
        "non-existent-user",
        "test-event",
        { data: "test" },
      );
      expect(result).toBe(0);
    });
  });

  describe("broadcast", () => {
    it("should send event to all connected clients", async () => {
      const client1 = { ...mockClient, id: "client-1" };
      const client2 = { ...mockClient, id: "client-2", userId: "test-user-2" };

      await manager.addClient(client1);
      await manager.addClient(client2);

      const result = await manager.broadcast("test-event", { data: "test" });

      expect(result).toBe(2);
      expect(client1.send).toHaveBeenCalledWith(
        expect.stringContaining("test-event"),
      );
      expect(client2.send).toHaveBeenCalledWith(
        expect.stringContaining("test-event"),
      );
    });
  });

  describe("getStats", () => {
    it("should return correct statistics", async () => {
      const client1 = { ...mockClient, id: "client-1" };
      const client2 = { ...mockClient, id: "client-2" };

      await manager.addClient(client1);
      await manager.addClient(client2);

      const stats = manager.getStats();

      expect(stats.totalConnections).toBe(2);
      expect(stats.activeConnections).toBe(2);
      expect(stats.connectionsByUser).toEqual({ "test-user-1": 2 });
      expect(stats.lastActivity).toBeGreaterThan(0);
    });
  });

  describe("getClientsByUser", () => {
    it("should return clients for specific user", async () => {
      const client1 = { ...mockClient, id: "client-1" };
      const client2 = { ...mockClient, id: "client-2", userId: "test-user-2" };

      await manager.addClient(client1);
      await manager.addClient(client2);

      const userClients = manager.getClientsByUser("test-user-1");
      expect(userClients).toHaveLength(1);
      expect(userClients[0]?.id).toBe("client-1");
    });
  });

  describe("disconnect", () => {
    it("should disconnect all clients", async () => {
      await manager.addClient(mockClient);

      manager.disconnect();

      expect(mockClient.close).toHaveBeenCalled();
      const stats = manager.getStats();
      expect(stats.totalConnections).toBe(0);
    });
  });
});
