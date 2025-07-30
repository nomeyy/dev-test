import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { getSSEManager, cleanupSSEManager } from "../sse-manager";
import type { SSEClient, SSEEvent } from "../types";

describe("SSE Manager", () => {
  let sseManager: ReturnType<typeof getSSEManager>;

  beforeEach(() => {
    // Clean up any existing instance
    cleanupSSEManager();
    sseManager = getSSEManager();
  });

  afterEach(() => {
    cleanupSSEManager();
  });

  describe("Client Management", () => {
    it("should add and remove clients correctly", () => {
      const mockClient: SSEClient = {
        id: "test-client-1",
        userId: "user-123",
        response: new Response(),
        createdAt: new Date(),
        lastPing: new Date(),
        isConnected: true,
        lastActivity: new Date(),
        errorCount: 0,
      };

      // Add client
      sseManager.addClient(mockClient);
      expect(sseManager.getClientCount()).toBe(1);
      expect(sseManager.getClientById("test-client-1")).toBeDefined();

      // Remove client
      sseManager.removeClient("test-client-1");
      expect(sseManager.getClientCount()).toBe(0);
      expect(sseManager.getClientById("test-client-1")).toBeUndefined();
    });

    it("should track client connection status", () => {
      const mockClient: SSEClient = {
        id: "test-client-2",
        userId: "user-456",
        response: new Response(),
        createdAt: new Date(),
        lastPing: new Date(),
        isConnected: true,
        lastActivity: new Date(),
        errorCount: 0,
      };

      sseManager.addClient(mockClient);
      expect(sseManager.isClientConnected("test-client-2")).toBe(true);

      // Simulate disconnection
      sseManager.removeClient("test-client-2");
      expect(sseManager.isClientConnected("test-client-2")).toBe(false);
    });

    it("should get clients by user ID", () => {
      const client1: SSEClient = {
        id: "client-1",
        userId: "user-123",
        response: new Response(),
        createdAt: new Date(),
        lastPing: new Date(),
        isConnected: true,
        lastActivity: new Date(),
        errorCount: 0,
      };

      const client2: SSEClient = {
        id: "client-2",
        userId: "user-123",
        response: new Response(),
        createdAt: new Date(),
        lastPing: new Date(),
        isConnected: true,
        lastActivity: new Date(),
        errorCount: 0,
      };

      const client3: SSEClient = {
        id: "client-3",
        userId: "user-456",
        response: new Response(),
        createdAt: new Date(),
        lastPing: new Date(),
        isConnected: true,
        lastActivity: new Date(),
        errorCount: 0,
      };

      sseManager.addClient(client1);
      sseManager.addClient(client2);
      sseManager.addClient(client3);

      const user123Clients = sseManager.getClientsByUserId("user-123");
      expect(user123Clients).toHaveLength(2);
      expect(user123Clients.map((c) => c.id)).toContain("client-1");
      expect(user123Clients.map((c) => c.id)).toContain("client-2");

      const user456Clients = sseManager.getClientsByUserId("user-456");
      expect(user456Clients).toHaveLength(1);
      expect(user456Clients[0]?.id).toBe("client-3");
    });
  });

  describe("Event Broadcasting", () => {
    it("should send events to specific clients", async () => {
      const mockClient: SSEClient = {
        id: "test-client-3",
        userId: "user-789",
        response: new Response(),
        createdAt: new Date(),
        lastPing: new Date(),
        isConnected: true,
        lastActivity: new Date(),
        errorCount: 0,
        controller: {
          enqueue: vi.fn(),
          close: vi.fn(),
          error: vi.fn(),
        } as any,
      };

      sseManager.addClient(mockClient);

      const event: SSEEvent = {
        event: "test_event",
        data: { message: "Hello World" },
        id: "test-123",
      };

      const result = await sseManager.sendToClient("test-client-3", event);
      expect(result).toBe(true);
    });

    it("should return false for non-existent clients", async () => {
      const event: SSEEvent = {
        event: "test_event",
        data: { message: "Hello World" },
      };

      const result = await sseManager.sendToClient(
        "non-existent-client",
        event,
      );
      expect(result).toBe(false);
    });

    it("should send events to all clients of a user", async () => {
      const client1: SSEClient = {
        id: "client-1",
        userId: "user-123",
        response: new Response(),
        createdAt: new Date(),
        lastPing: new Date(),
        isConnected: true,
        lastActivity: new Date(),
        errorCount: 0,
        controller: {
          enqueue: vi.fn(),
          close: vi.fn(),
          error: vi.fn(),
        } as any,
      };

      const client2: SSEClient = {
        id: "client-2",
        userId: "user-123",
        response: new Response(),
        createdAt: new Date(),
        lastPing: new Date(),
        isConnected: true,
        lastActivity: new Date(),
        errorCount: 0,
        controller: {
          enqueue: vi.fn(),
          close: vi.fn(),
          error: vi.fn(),
        } as any,
      };

      sseManager.addClient(client1);
      sseManager.addClient(client2);

      const event: SSEEvent = {
        event: "user_notification",
        data: { message: "User notification" },
      };

      const sentCount = await sseManager.sendToUser("user-123", event);
      expect(sentCount).toBe(2);
    });

    it("should broadcast events to all clients", async () => {
      const client1: SSEClient = {
        id: "client-1",
        userId: "user-123",
        response: new Response(),
        createdAt: new Date(),
        lastPing: new Date(),
        isConnected: true,
        lastActivity: new Date(),
        errorCount: 0,
        controller: {
          enqueue: vi.fn(),
          close: vi.fn(),
          error: vi.fn(),
        } as any,
      };

      const client2: SSEClient = {
        id: "client-2",
        userId: "user-456",
        response: new Response(),
        createdAt: new Date(),
        lastPing: new Date(),
        isConnected: true,
        lastActivity: new Date(),
        errorCount: 0,
        controller: {
          enqueue: vi.fn(),
          close: vi.fn(),
          error: vi.fn(),
        } as any,
      };

      sseManager.addClient(client1);
      sseManager.addClient(client2);

      const event: SSEEvent = {
        event: "system_broadcast",
        data: { message: "System broadcast" },
      };

      const sentCount = await sseManager.broadcast(event);
      expect(sentCount).toBe(2);
    });
  });

  describe("Error Handling", () => {
    it("should handle client errors gracefully", async () => {
      const mockClient: SSEClient = {
        id: "error-client",
        userId: "user-error",
        response: new Response(),
        createdAt: new Date(),
        lastPing: new Date(),
        isConnected: true,
        lastActivity: new Date(),
        errorCount: 0,
        controller: {
          enqueue: vi.fn().mockImplementation(() => {
            throw new Error("Controller error");
          }),
          close: vi.fn(),
          error: vi.fn(),
        } as any,
      };

      sseManager.addClient(mockClient);

      const event: SSEEvent = {
        event: "test_event",
        data: { message: "Test" },
      };

      // First few errors should be tolerated
      for (let i = 0; i < 4; i++) {
        const result = await sseManager.sendToClient("error-client", event);
        expect(result).toBe(false);
      }

      // After max errors, client should be removed
      const result = await sseManager.sendToClient("error-client", event);
      expect(result).toBe(false);
      expect(sseManager.getClientById("error-client")).toBeUndefined();
    });
  });

  describe("Cleanup", () => {
    it("should clean up resources properly", () => {
      const mockClient: SSEClient = {
        id: "cleanup-client",
        userId: "user-cleanup",
        response: new Response(),
        createdAt: new Date(),
        lastPing: new Date(),
        isConnected: true,
        lastActivity: new Date(),
        errorCount: 0,
        controller: {
          enqueue: vi.fn(),
          close: vi.fn(),
          error: vi.fn(),
        } as any,
      };

      sseManager.addClient(mockClient);
      expect(sseManager.getClientCount()).toBe(1);

      sseManager.cleanup();
      expect(sseManager.getClientCount()).toBe(0);
    });
  });
});
