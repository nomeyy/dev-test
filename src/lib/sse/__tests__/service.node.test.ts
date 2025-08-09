import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { sseService } from "../service";
import { sseManager } from "../manager";

// Mock the SSE manager
vi.mock("../manager", () => ({
  sseManager: {
    sendToUser: vi.fn(),
    broadcast: vi.fn(),
    getConnectionCount: vi.fn(),
  },
}));

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

describe("SSE Service", () => {
  const mockSseManager = vi.mocked(sseManager);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("sendNotification", () => {
    it("should send notification to user successfully", async () => {
      const userId = "user-123";
      const message = "Test notification";
      const metadata = { priority: "high" };

      mockSseManager.sendToUser.mockResolvedValue();

      await sseService.sendNotification(userId, message, metadata);

      expect(mockSseManager.sendToUser).toHaveBeenCalledWith(
        userId,
        "notification",
        expect.objectContaining({
          timestamp: expect.any(String),
          message,
          priority: "high",
        }),
      );
    });

    it("should handle errors when sending notification", async () => {
      const userId = "user-123";
      const message = "Test notification";
      const error = new Error("Send failed");

      mockSseManager.sendToUser.mockRejectedValue(error);

      await expect(
        sseService.sendNotification(userId, message),
      ).resolves.not.toThrow();
    });
  });

  describe("sendCustomEvent", () => {
    it("should send custom event to user successfully", async () => {
      const userId = "user-123";
      const eventType = "user_action";
      const data = { action: "click", element: "button" };

      mockSseManager.sendToUser.mockResolvedValue();

      await sseService.sendCustomEvent(userId, eventType, data);

      expect(mockSseManager.sendToUser).toHaveBeenCalledWith(
        userId,
        "custom",
        expect.objectContaining({
          timestamp: expect.any(String),
          action: "click",
          element: "button",
        }),
        eventType,
      );
    });

    it("should handle errors when sending custom event", async () => {
      const userId = "user-123";
      const eventType = "user_action";
      const data = { action: "click" };
      const error = new Error("Send failed");

      mockSseManager.sendToUser.mockRejectedValue(error);

      await expect(
        sseService.sendCustomEvent(userId, eventType, data),
      ).resolves.not.toThrow();
    });
  });

  describe("broadcastNotification", () => {
    it("should broadcast notification to all users successfully", async () => {
      const message = "System maintenance";
      const metadata = { maintenance: true };

      mockSseManager.broadcast.mockResolvedValue();
      mockSseManager.getConnectionCount.mockReturnValue(5);

      await sseService.broadcastNotification(message, metadata);

      expect(mockSseManager.broadcast).toHaveBeenCalledWith(
        "notification",
        expect.objectContaining({
          timestamp: expect.any(String),
          message,
          maintenance: true,
        }),
      );
    });

    it("should handle errors when broadcasting notification", async () => {
      const message = "System maintenance";
      const error = new Error("Broadcast failed");

      mockSseManager.broadcast.mockRejectedValue(error);

      await expect(
        sseService.broadcastNotification(message),
      ).resolves.not.toThrow();
    });
  });
});
