import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { SSEManager } from "../services/sse-manager";
import type { SSEEventPayload } from "../types";

// Mock NextRequest
const mockRequest = {
  signal: {
    addEventListener: vi.fn(),
  },
} as any;

// Mock Response
const mockResponse = new Response();

// Mock ReadableStream
const mockStream = new ReadableStream({
  start(controller) {
    // Mock controller
  },
});

describe("SSEManager (Node.js)", () => {
  let sseManager: SSEManager;

  beforeEach(() => {
    sseManager = new SSEManager({
      enableLogging: false,
      heartbeatInterval: 1000, // 1 second for testing
    });
  });

  afterEach(() => {
    sseManager.destroy();
  });

  describe("Client Management", () => {
    it("should add a client successfully", async () => {
      const clientId = "test-client-1";
      const userId = "user-123";
      const sessionId = "session-456";

      const mockController = {
        enqueue: vi.fn(),
      } as any;

      const client = await sseManager.addClient(
        clientId,
        mockRequest,
        mockResponse,
        mockController,
        mockStream,
        userId,
        sessionId,
      );

      expect(client.id).toBe(clientId);
      expect(client.userId).toBe(userId);
      expect(client.sessionId).toBe(sessionId);
      expect(client.isConnected).toBe(true);
    });

    it("should remove a client successfully", async () => {
      const clientId = "test-client-2";

      // Add client first
      await sseManager.addClient(
        clientId,
        mockRequest,
        mockResponse,
        {} as any,
        mockStream,
      );

      const result = sseManager.removeClient(clientId);
      expect(result).toBe(true);

      // Verify client is removed
      expect(sseManager.isClientConnected(clientId)).toBe(false);
    });

    it("should return false when removing non-existent client", () => {
      const result = sseManager.removeClient("non-existent");
      expect(result).toBe(false);
    });

    it("should check if client is connected", async () => {
      const clientId = "test-client-3";

      // Initially not connected
      expect(sseManager.isClientConnected(clientId)).toBe(false);

      // Add client
      await sseManager.addClient(
        clientId,
        mockRequest,
        mockResponse,
        {} as any,
        mockStream,
      );

      // Now connected
      expect(sseManager.isClientConnected(clientId)).toBe(true);
    });
  });

  describe("Event Broadcasting", () => {
    it("should broadcast to all connected clients", async () => {
      const clientIds = ["client-1", "client-2", "client-3"];

      // Add multiple clients
      for (const clientId of clientIds) {
        const mockController = {
          enqueue: vi.fn(),
        } as any;

        await sseManager.addClient(
          clientId,
          mockRequest,
          mockResponse,
          mockController,
          mockStream,
        );
      }

      const event = "test-event";
      const payload: SSEEventPayload = { message: "test message" };

      const sentCount = await sseManager.broadcast(event, payload);
      expect(sentCount).toBe(3);
    });

    it("should send to specific user", async () => {
      const userId = "user-123";
      const clientIds = ["client-1", "client-2"];

      // Add clients with same user ID
      for (const clientId of clientIds) {
        const mockController = {
          enqueue: vi.fn(),
        } as any;

        await sseManager.addClient(
          clientId,
          mockRequest,
          mockResponse,
          mockController,
          mockStream,
          userId,
        );
      }

      // Add another client with different user ID
      const mockController = {
        enqueue: vi.fn(),
      } as any;

      await sseManager.addClient(
        "client-3",
        mockRequest,
        mockResponse,
        mockController,
        mockStream,
        "user-456",
      );

      const sentCount = await sseManager.sendToUser(userId, "test", {
        message: "test",
      });
      expect(sentCount).toBe(2); // Only the two clients with user-123
    });

    it("should send to specific session", async () => {
      const sessionId = "session-123";
      const clientIds = ["client-1", "client-2"];

      // Add clients with same session ID
      for (const clientId of clientIds) {
        const mockController = {
          enqueue: vi.fn(),
        } as any;

        await sseManager.addClient(
          clientId,
          mockRequest,
          mockResponse,
          mockController,
          mockStream,
          undefined,
          sessionId,
        );
      }

      // Add another client with different session ID
      const mockController = {
        enqueue: vi.fn(),
      } as any;

      await sseManager.addClient(
        "client-3",
        mockRequest,
        mockResponse,
        mockController,
        mockStream,
        undefined,
        "session-456",
      );

      const sentCount = await sseManager.sendToSession(sessionId, "test", {
        message: "test",
      });
      expect(sentCount).toBe(2); // Only the two clients with session-123
    });
  });

  describe("Statistics", () => {
    it("should track connection statistics", async () => {
      const initialStats = sseManager.getStats();
      expect(initialStats.totalConnections).toBe(0);
      expect(initialStats.activeConnections).toBe(0);

      // Add a client
      await sseManager.addClient(
        "test-client",
        mockRequest,
        mockResponse,
        {} as any,
        mockStream,
      );

      const statsAfterAdd = sseManager.getStats();
      expect(statsAfterAdd.totalConnections).toBe(1);
      expect(statsAfterAdd.activeConnections).toBe(1);

      // Remove the client
      sseManager.removeClient("test-client");

      const statsAfterRemove = sseManager.getStats();
      expect(statsAfterRemove.totalConnections).toBe(1); // Total doesn't decrease
      expect(statsAfterRemove.activeConnections).toBe(0); // Active decreases
    });

    it("should get active client IDs", async () => {
      const clientIds = ["client-1", "client-2", "client-3"];

      // Add clients
      for (const clientId of clientIds) {
        await sseManager.addClient(
          clientId,
          mockRequest,
          mockResponse,
          {} as any,
          mockStream,
        );
      }

      const activeClients = sseManager.getActiveClientIds();
      expect(activeClients).toHaveLength(3);
      expect(activeClients).toContain("client-1");
      expect(activeClients).toContain("client-2");
      expect(activeClients).toContain("client-3");
    });
  });

  describe("Configuration", () => {
    it("should respect max connections limit", async () => {
      const limitedManager = new SSEManager({
        maxConnections: 2,
        enableLogging: false,
      });

      // Add 2 clients successfully
      await limitedManager.addClient(
        "client-1",
        mockRequest,
        mockResponse,
        {} as any,
        mockStream,
      );
      await limitedManager.addClient(
        "client-2",
        mockRequest,
        mockResponse,
        {} as any,
        mockStream,
      );

      // Third client should fail
      await expect(
        limitedManager.addClient(
          "client-3",
          mockRequest,
          mockResponse,
          {} as any,
          mockStream,
        ),
      ).rejects.toThrow("Connection limit exceeded");

      limitedManager.destroy();
    });
  });
});
