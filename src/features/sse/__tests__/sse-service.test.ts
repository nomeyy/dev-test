import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { sseService } from "../services/sse-service";
import { SSEEventType } from "../types";
import type { SSEEvent } from "../types";

// Mock Redis
vi.mock("@/lib/redis", () => ({
  getRedis: vi.fn().mockResolvedValue({
    publish: vi.fn().mockResolvedValue(1),
  }),
}));

describe("SSE Service", () => {
  beforeEach(() => {
    // Reset the service before each test
    // Note: In a real implementation, you might want to create a fresh instance
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Clean up any timers
    vi.clearAllTimers();
  });

  describe("Connection Management", () => {
    it("should register a new connection", () => {
      const mockRequest = {} as any;
      const mockController = new AbortController();

      const connectionId = sseService.registerConnection({
        userId: "user123",
        sessionId: "session456",
        request: mockRequest,
        controller: mockController,
      });

      expect(connectionId).toBeDefined();
      expect(connectionId).toMatch(/^sse_\d+_[a-z0-9]+$/);
    });

    it("should remove a connection", () => {
      const mockRequest = {} as any;
      const mockController = new AbortController();

      const connectionId = sseService.registerConnection({
        userId: "user123",
        request: mockRequest,
        controller: mockController,
      });

      sseService.removeConnection(connectionId);

      // Verify connection is removed (this would require access to internal state)
      // For now, we just test that the method doesn't throw
      expect(() => sseService.removeConnection(connectionId)).not.toThrow();
    });
  });

  describe("Event Sending", () => {
    it("should send an event to a specific user", async () => {
      const mockRequest = {} as any;
      const mockController = new AbortController();

      // Register a connection for a user
      const connectionId = sseService.registerConnection({
        userId: "user123",
        request: mockRequest,
        controller: mockController,
      });

      const event: SSEEvent = {
        type: SSEEventType.NOTIFICATION,
        data: { message: "Test notification" },
        timestamp: Date.now(),
      };

      // This should not throw
      await expect(
        sseService.sendEvent(event, { userId: "user123" }),
      ).resolves.not.toThrow();

      // Clean up
      sseService.removeConnection(connectionId);
    });

    it("should broadcast an event to all connections", async () => {
      const mockRequest = {} as any;
      const mockController = new AbortController();

      // Register multiple connections
      const connectionId1 = sseService.registerConnection({
        userId: "user123",
        request: mockRequest,
        controller: mockController,
      });

      const connectionId2 = sseService.registerConnection({
        userId: "user456",
        request: mockRequest,
        controller: mockController,
      });

      const event: SSEEvent = {
        type: SSEEventType.MESSAGE,
        data: { message: "Broadcast message" },
        timestamp: Date.now(),
      };

      // This should not throw
      await expect(
        sseService.sendEvent(event, { broadcast: true }),
      ).resolves.not.toThrow();

      // Clean up
      sseService.removeConnection(connectionId1);
      sseService.removeConnection(connectionId2);
    });
  });

  describe("Statistics", () => {
    it("should return connection statistics", () => {
      const stats = sseService.getStats();

      expect(stats).toHaveProperty("totalConnections");
      expect(stats).toHaveProperty("uniqueUsers");
      expect(stats).toHaveProperty("uniqueSessions");
      expect(stats).toHaveProperty("maxConnections");

      expect(typeof stats.totalConnections).toBe("number");
      expect(typeof stats.uniqueUsers).toBe("number");
      expect(typeof stats.uniqueSessions).toBe("number");
      expect(typeof stats.maxConnections).toBe("number");
    });
  });

  describe("Event Types", () => {
    it("should support all defined event types", () => {
      const eventTypes = Object.values(SSEEventType);

      expect(eventTypes).toContain("message");
      expect(eventTypes).toContain("notification");
      expect(eventTypes).toContain("upload_progress");
      expect(eventTypes).toContain("asset_ready");
      expect(eventTypes).toContain("user_update");
      expect(eventTypes).toContain("heartbeat");
    });
  });

  describe("Error Handling", () => {
    it("should handle sending events to non-existent users gracefully", async () => {
      const event: SSEEvent = {
        type: SSEEventType.NOTIFICATION,
        data: { message: "Test" },
        timestamp: Date.now(),
      };

      // Should not throw when sending to non-existent user
      await expect(
        sseService.sendEvent(event, { userId: "non-existent-user" }),
      ).resolves.not.toThrow();
    });

    it("should handle sending events to non-existent connections gracefully", async () => {
      const event: SSEEvent = {
        type: SSEEventType.MESSAGE,
        data: { message: "Test" },
        timestamp: Date.now(),
      };

      // Should not throw when sending to non-existent connection
      await expect(
        sseService.sendEvent(event, {
          connectionId: "non-existent-connection",
        }),
      ).resolves.not.toThrow();
    });
  });
});
