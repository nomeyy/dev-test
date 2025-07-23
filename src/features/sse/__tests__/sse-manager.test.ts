import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { SSEManager } from "../services/sse-manager";

// Mock the logger
vi.mock("@/utils/logging", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe("SSEManager", () => {
  let sseManager: SSEManager;
  let mockWriter: any;

  beforeEach(() => {
    sseManager = new SSEManager({
      heartbeatInterval: 100, // Short interval for testing
      connectionTimeout: 200,
      maxConnections: 10,
    });

    mockWriter = {
      write: vi.fn().mockResolvedValue(undefined),
      close: vi.fn(),
    };
  });

  afterEach(() => {
    sseManager.shutdown();
  });

  describe("Connection Management", () => {
    it("should add a connection successfully", () => {
      const result = sseManager.addConnection(
        "conn1",
        mockWriter,
        "user1",
        "session1",
      );
      expect(result).toBe(true);

      const stats = sseManager.getStats();
      expect(stats.totalConnections).toBe(1);
      expect(stats.userConnections).toBe(1);
      expect(stats.sessionConnections).toBe(1);
    });

    it("should reject connections when max limit is reached", () => {
      // Add max connections
      for (let i = 0; i < 10; i++) {
        sseManager.addConnection(`conn${i}`, mockWriter, `user${i}`);
      }

      // Try to add one more
      const result = sseManager.addConnection("conn11", mockWriter, "user11");
      expect(result).toBe(false);
    });

    it("should remove connections and clean up references", () => {
      sseManager.addConnection("conn1", mockWriter, "user1", "session1");
      sseManager.removeConnection("conn1");

      const stats = sseManager.getStats();
      expect(stats.totalConnections).toBe(0);
      expect(stats.userConnections).toBe(0);
      expect(stats.sessionConnections).toBe(0);
      expect(mockWriter.close).toHaveBeenCalled();
    });
  });

  describe("Event Sending", () => {
    beforeEach(() => {
      sseManager.addConnection("conn1", mockWriter, "user1", "session1");
      sseManager.addConnection("conn2", mockWriter, "user2", "session1");
    });

    it("should send event to specific connection", async () => {
      const result = await sseManager.sendEvent(
        {
          type: "test",
          data: { message: "hello" },
        },
        { connectionId: "conn1" },
      );

      expect(result).toBe(1);
      expect(mockWriter.write).toHaveBeenCalledWith(expect.any(Uint8Array));
    });

    it("should send event to all connections for a user", async () => {
      // Add another connection for user1
      sseManager.addConnection("conn3", mockWriter, "user1", "session2");

      const result = await sseManager.sendEvent(
        {
          type: "test",
          data: { message: "hello" },
        },
        { userId: "user1" },
      );

      expect(result).toBe(2); // conn1 and conn3
    });

    it("should broadcast to all connections", async () => {
      const result = await sseManager.sendEvent(
        {
          type: "test",
          data: { message: "hello" },
        },
        { broadcast: true },
      );

      expect(result).toBe(2); // conn1 and conn2
    });

    it("should handle failed event sending", async () => {
      mockWriter.write.mockRejectedValueOnce(new Error("Write failed"));

      const result = await sseManager.sendEvent(
        {
          type: "test",
          data: { message: "hello" },
        },
        { connectionId: "conn1" },
      );

      expect(result).toBe(0);
      // Connection should be removed after failure
      const stats = sseManager.getStats();
      expect(stats.totalConnections).toBe(1); // Only conn2 should remain
    });
  });

  describe("Event Formatting", () => {
    it("should format SSE events correctly", async () => {
      sseManager.addConnection("conn1", mockWriter, "user1");

      await sseManager.sendEvent(
        {
          type: "test",
          data: { message: "hello" },
          id: "123",
          retry: 5000,
        },
        { connectionId: "conn1" },
      );

      const writeCall = mockWriter.write.mock.calls[1]; // Skip initial connection event
      const writtenData = new TextDecoder().decode(writeCall[0]);

      expect(writtenData).toContain("id: 123");
      expect(writtenData).toContain("retry: 5000");
      expect(writtenData).toContain("event: test");
      expect(writtenData).toContain('data: {"message":"hello"}');
    });
  });

  describe("Statistics", () => {
    it("should return correct statistics", () => {
      sseManager.addConnection("conn1", mockWriter, "user1", "session1");
      sseManager.addConnection("conn2", mockWriter, "user1", "session2");
      sseManager.addConnection("conn3", mockWriter, "user2", "session1");

      const stats = sseManager.getStats();
      expect(stats.totalConnections).toBe(3);
      expect(stats.userConnections).toBe(2); // user1 and user2
      expect(stats.sessionConnections).toBe(2); // session1 and session2
    });
  });
});
