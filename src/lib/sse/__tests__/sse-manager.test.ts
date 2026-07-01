/**
 * SSE Manager Tests
 *
 * Tests for the core SSE functionality including client management,
 * event sending, and connection tracking.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { SSEManager } from "../index";

// Mock the SSE route functions
vi.mock("@/app/api/sse/route", () => ({
  sendToClient: vi.fn(),
  broadcastEvent: vi.fn(),
  clients: new Map(),
  getConnections: vi.fn(() => ({ total: 0, clients: [] })),
}));

// Mock the logger
vi.mock("@/utils/logging", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

describe("SSEManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("sendToClient", () => {
    it("should send an event to a specific client", () => {
      const mockSendToClient = vi.mocked(
        require("@/app/api/sse/route").sendToClient,
      );

      const result = SSEManager.sendToClient("client123", "test:event", {
        message: "Hello",
      });

      expect(mockSendToClient).toHaveBeenCalledWith("client123", {
        type: "test:event",
        data: { message: "Hello" },
        timestamp: expect.any(String),
        metadata: undefined,
      });
      expect(result).toBe(true);
    });

    it("should handle errors gracefully", () => {
      const mockSendToClient = vi.mocked(
        require("@/app/api/sse/route").sendToClient,
      );
      mockSendToClient.mockImplementation(() => {
        throw new Error("Connection failed");
      });

      const result = SSEManager.sendToClient("client123", "test:event", {
        message: "Hello",
      });

      expect(result).toBe(false);
    });
  });

  describe("sendToUser", () => {
    it("should send an event to all connections of a user", () => {
      // Mock clients map with user connections
      const mockClients = new Map([
        ["client1", { userId: "user123", username: "john" }],
        ["client2", { userId: "user456", username: "jane" }],
        ["client3", { userId: "user123", username: "john" }],
      ]);

      vi.mocked(require("@/app/api/sse/route").clients).mockReturnValue(
        mockClients,
      );

      const mockSendToClient = vi
        .spyOn(SSEManager, "sendToClient")
        .mockReturnValue(true);

      const result = SSEManager.sendToUser("user123", "test:event", {
        message: "Hello",
      });

      expect(mockSendToClient).toHaveBeenCalledTimes(2); // 2 clients for user123
      expect(result).toBe(2);
    });

    it("should return 0 when user has no connections", () => {
      const mockClients = new Map([
        ["client1", { userId: "user456", username: "jane" }],
      ]);

      vi.mocked(require("@/app/api/sse/route").clients).mockReturnValue(
        mockClients,
      );

      const result = SSEManager.sendToUser("user123", "test:event", {
        message: "Hello",
      });

      expect(result).toBe(0);
    });
  });

  describe("broadcast", () => {
    it("should broadcast an event to all clients", () => {
      const mockBroadcastEvent = vi.mocked(
        require("@/app/api/sse/route").broadcastEvent,
      );
      const mockClients = new Map([
        ["client1", {}],
        ["client2", {}],
        ["client3", {}],
      ]);

      vi.mocked(require("@/app/api/sse/route").clients).mockReturnValue(
        mockClients,
      );

      const result = SSEManager.broadcast("test:event", { message: "Hello" });

      expect(mockBroadcastEvent).toHaveBeenCalledWith("test:event", {
        type: "test:event",
        data: { message: "Hello" },
        timestamp: expect.any(String),
        metadata: undefined,
      });
      expect(result).toBe(3);
    });
  });

  describe("notifyClient", () => {
    it("should send a notification to a specific client", () => {
      const mockSendToClient = vi
        .spyOn(SSEManager, "sendToClient")
        .mockReturnValue(true);

      const result = SSEManager.notifyClient("client123", "Hello from server");

      expect(mockSendToClient).toHaveBeenCalledWith(
        "client123",
        "notification",
        {
          message: "Hello from server",
        },
        undefined,
      );
      expect(result).toBe(true);
    });
  });

  describe("notifyUser", () => {
    it("should send a notification to a specific user", () => {
      const mockSendToUser = vi
        .spyOn(SSEManager, "sendToUser")
        .mockReturnValue(2);

      const result = SSEManager.notifyUser("user123", "Hello from server");

      expect(mockSendToUser).toHaveBeenCalledWith(
        "user123",
        "notification",
        {
          message: "Hello from server",
        },
        undefined,
      );
      expect(result).toBe(2);
    });
  });

  describe("sendSystemNotification", () => {
    it("should send a system notification to all clients by default", () => {
      const mockBroadcast = vi
        .spyOn(SSEManager, "broadcast")
        .mockReturnValue(5);

      const result = SSEManager.sendSystemNotification("maintenance", {
        message: "Scheduled maintenance",
      });

      expect(mockBroadcast).toHaveBeenCalledWith(
        "maintenance",
        {
          message: "Scheduled maintenance",
        },
        {
          system: true,
          source: "system",
        },
      );
      expect(result).toBe(5);
    });

    it("should send a system notification to a specific client", () => {
      const mockSendToClient = vi
        .spyOn(SSEManager, "sendToClient")
        .mockReturnValue(true);

      const result = SSEManager.sendSystemNotification(
        "maintenance",
        {
          message: "Scheduled maintenance",
        },
        "client",
        "client123",
      );

      expect(mockSendToClient).toHaveBeenCalledWith(
        "client123",
        "maintenance",
        {
          message: "Scheduled maintenance",
        },
        {
          system: true,
          source: "system",
        },
      );
      expect(result).toBe(true);
    });

    it("should throw error when target is client but no targetId provided", () => {
      expect(() => {
        SSEManager.sendSystemNotification(
          "maintenance",
          {
            message: "Scheduled maintenance",
          },
          "client",
        );
      }).toThrow("Client ID required for client-targeted notifications");
    });
  });

  describe("sendWebhookNotification", () => {
    it("should send a webhook notification with proper metadata", () => {
      const mockSendSystemNotification = vi
        .spyOn(SSEManager, "sendSystemNotification")
        .mockReturnValue(3);

      const result = SSEManager.sendWebhookNotification(
        "payment:completed",
        {
          orderId: "12345",
        },
        "channel",
        "payments",
      );

      expect(mockSendSystemNotification).toHaveBeenCalledWith(
        "payment:completed",
        {
          orderId: "12345",
        },
        "channel",
        "payments",
      );
      expect(result).toBe(3);
    });
  });

  describe("sendJobNotification", () => {
    it("should send a job notification with proper metadata", () => {
      const mockSendSystemNotification = vi
        .spyOn(SSEManager, "sendSystemNotification")
        .mockReturnValue(1);

      const result = SSEManager.sendJobNotification(
        "job123",
        "completed",
        {
          result: "success",
        },
        "user",
        "user123",
      );

      expect(mockSendSystemNotification).toHaveBeenCalledWith(
        "job:completed",
        {
          result: "success",
        },
        "user",
        "user123",
      );
      expect(result).toBe(1);
    });
  });

  describe("sendRealtimeUpdate", () => {
    it("should send a real-time update with proper metadata", () => {
      const mockSendSystemNotification = vi
        .spyOn(SSEManager, "sendSystemNotification")
        .mockReturnValue(2);

      const result = SSEManager.sendRealtimeUpdate(
        "post",
        "post123",
        "created",
        {
          title: "New Post",
        },
        "channel",
        "updates",
      );

      expect(mockSendSystemNotification).toHaveBeenCalledWith(
        "realtime:post:created",
        {
          title: "New Post",
        },
        "channel",
        "updates",
      );
      expect(result).toBe(2);
    });
  });

  describe("sendUserActivityNotification", () => {
    it("should send a user activity notification with proper metadata", () => {
      const mockSendSystemNotification = vi
        .spyOn(SSEManager, "sendSystemNotification")
        .mockReturnValue(1);

      const result = SSEManager.sendUserActivityNotification(
        "user123",
        "login",
        {
          ipAddress: "192.168.1.1",
        },
        "user",
        "user123",
      );

      expect(mockSendSystemNotification).toHaveBeenCalledWith(
        "user:login",
        {
          ipAddress: "192.168.1.1",
        },
        "user",
        "user123",
      );
      expect(result).toBe(1);
    });
  });

  describe("getConnections", () => {
    it("should return connection statistics", () => {
      const mockGetConnections = vi.mocked(
        require("@/app/api/sse/route").getConnections,
      );
      mockGetConnections.mockReturnValue({
        total: 3,
        clients: ["client1", "client2", "client3"],
      });

      const mockClients = new Map([
        [
          "client1",
          { userId: "user123", username: "john", lastActive: Date.now() },
        ],
        [
          "client2",
          { userId: "user456", username: "jane", lastActive: Date.now() },
        ],
        [
          "client3",
          { userId: "user123", username: "john", lastActive: Date.now() },
        ],
      ]);

      vi.mocked(require("@/app/api/sse/route").clients).mockReturnValue(
        mockClients,
      );

      const result = SSEManager.getConnections();

      expect(result.total).toBe(3);
      expect(result.clients).toHaveLength(3);
      expect(result.activeUsers.size).toBe(2); // user123 and user456
    });

    it("should handle errors gracefully", () => {
      const mockGetConnections = vi.mocked(
        require("@/app/api/sse/route").getConnections,
      );
      mockGetConnections.mockImplementation(() => {
        throw new Error("Failed to get connections");
      });

      const result = SSEManager.getConnections();

      expect(result.total).toBe(0);
      expect(result.clients).toHaveLength(0);
      expect(result.activeUsers.size).toBe(0);
    });
  });

  describe("isClientConnected", () => {
    it("should check if a client is connected", () => {
      const mockClients = new Map([
        ["client1", {}],
        ["client2", {}],
      ]);

      vi.mocked(require("@/app/api/sse/route").clients).mockReturnValue(
        mockClients,
      );

      expect(SSEManager.isClientConnected("client1")).toBe(true);
      expect(SSEManager.isClientConnected("client3")).toBe(false);
    });
  });

  describe("isUserOnline", () => {
    it("should check if a user has active connections", () => {
      const mockClients = new Map([
        ["client1", { userId: "user123" }],
        ["client2", { userId: "user456" }],
        ["client3", { userId: "user123" }],
      ]);

      vi.mocked(require("@/app/api/sse/route").clients).mockReturnValue(
        mockClients,
      );

      expect(SSEManager.isUserOnline("user123")).toBe(true);
      expect(SSEManager.isUserOnline("user789")).toBe(false);
    });
  });

  describe("getUserClients", () => {
    it("should get all clients for a specific user", () => {
      const mockClients = new Map([
        ["client1", { userId: "user123" }],
        ["client2", { userId: "user456" }],
        ["client3", { userId: "user123" }],
      ]);

      vi.mocked(require("@/app/api/sse/route").clients).mockReturnValue(
        mockClients,
      );

      const result = SSEManager.getUserClients("user123");

      expect(result).toContain("client1");
      expect(result).toContain("client3");
      expect(result).not.toContain("client2");
      expect(result).toHaveLength(2);
    });
  });

  describe("disconnectClient", () => {
    it("should disconnect a specific client", () => {
      const mockClients = new Map([
        ["client1", { controller: { close: vi.fn() } }],
      ]);

      vi.mocked(require("@/app/api/sse/route").clients).mockReturnValue(
        mockClients,
      );

      const result = SSEManager.disconnectClient("client1");

      expect(result).toBe(true);
      expect(mockClients.get("client1")?.controller.close).toHaveBeenCalled();
    });

    it("should return false for non-existent client", () => {
      const mockClients = new Map();

      vi.mocked(require("@/app/api/sse/route").clients).mockReturnValue(
        mockClients,
      );

      const result = SSEManager.disconnectClient("nonexistent");

      expect(result).toBe(false);
    });
  });

  describe("disconnectUser", () => {
    it("should disconnect all clients for a specific user", () => {
      const mockDisconnectClient = vi
        .spyOn(SSEManager, "disconnectClient")
        .mockReturnValue(true);
      const mockGetUserClients = vi
        .spyOn(SSEManager, "getUserClients")
        .mockReturnValue(["client1", "client2"]);

      const result = SSEManager.disconnectUser("user123");

      expect(mockGetUserClients).toHaveBeenCalledWith("user123");
      expect(mockDisconnectClient).toHaveBeenCalledTimes(2);
      expect(result).toBe(2);
    });
  });
});
