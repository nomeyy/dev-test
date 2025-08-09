import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { sseManager } from "../manager";
import { sseService } from "../service";
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

describe("SSE Events", () => {
  let mockController: ReadableStreamDefaultController;

  beforeEach(() => {
    sseManager.reset();
    mockController = {
      enqueue: vi.fn(),
      close: vi.fn(),
      error: vi.fn(),
    } as unknown as ReadableStreamDefaultController;
  });

  afterEach(() => {
    sseManager.reset();
  });

  describe("Event Formatting", () => {
    it("should format basic SSE event correctly", async () => {
      sseManager.registerClient("user-123", "client-456", mockController);

      await sseManager.sendToUser("user-123", "notification", {
        message: "Test notification",
        timestamp: "2024-01-01T00:00:00.000Z",
      });

      expect(mockController.enqueue).toHaveBeenCalledWith(
        expect.any(Uint8Array),
      );

      // Decode the sent data to verify format
      const sentData = new TextDecoder().decode(
        (mockController.enqueue as any).mock.calls[0][0],
      );

      expect(sentData).toContain("event: notification");
      expect(sentData).toContain(
        'data: {"message":"Test notification","timestamp":"2024-01-01T00:00:00.000Z"}',
      );
      expect(sentData).toMatch(/^event: notification\ndata: .*\n\n$/);
    });

    it("should format SSE event with custom event ID", async () => {
      sseManager.registerClient("user-123", "client-456", mockController);

      await sseManager.sendEvent({
        eventType: "notification",
        data: {
          message: "Test notification",
          timestamp: "2024-01-01T00:00:00.000Z",
        },
        eventId: "event-123",
        targetUsers: ["user-123"],
      });
      const sentData = new TextDecoder().decode(
        (mockController.enqueue as any).mock.calls[0][0],
      );

      expect(sentData).toContain("id: event-123");
      expect(sentData).toMatch(
        /^event: notification\nid: event-123\ndata: .*\n\n$/,
      );
    });

    it("should format broadcast event correctly", async () => {
      sseManager.registerClient("user-123", "client-456", mockController);
      sseManager.registerClient("user-456", "client-789", mockController);

      await sseManager.broadcast("notification", {
        message: "System maintenance",
        maintenance: true,
        timestamp: "2024-01-01T00:00:00.000Z",
      });

      expect(mockController.enqueue).toHaveBeenCalledTimes(2);

      const sentData = new TextDecoder().decode(
        (mockController.enqueue as any).mock.calls[0][0],
      );

      expect(sentData).toContain("event: notification");
      expect(sentData).toContain('"maintenance":true');
    });
  });

  describe("Event Types", () => {
    it("should handle notification events", async () => {
      sseManager.registerClient("user-123", "client-456", mockController);

      await sseService.sendNotification(
        "user-123",
        "Welcome to the platform!",
        {
          priority: "high",
          category: "welcome",
        },
      );

      const sentData = new TextDecoder().decode(
        (mockController.enqueue as any).mock.calls[0][0],
      );

      expect(sentData).toContain("event: notification");
      expect(sentData).toContain("Welcome to the platform!");
      expect(sentData).toContain('"priority":"high"');
      expect(sentData).toContain('"category":"welcome"');
    });

    it("should handle custom events", async () => {
      sseManager.registerClient("user-123", "client-456", mockController);

      await sseService.sendCustomEvent("user-123", "user_action", {
        action: "button_click",
        element: "submit_button",
        page: "checkout",
      });

      const sentData = new TextDecoder().decode(
        (mockController.enqueue as any).mock.calls[0][0],
      );

      expect(sentData).toContain("event: custom");
      expect(sentData).toContain('"action":"button_click"');
      expect(sentData).toContain('"element":"submit_button"');
      expect(sentData).toContain('"page":"checkout"');
    });

    it("should handle broadcast notifications", async () => {
      sseManager.registerClient("user-123", "client-456", mockController);
      sseManager.registerClient("user-456", "client-789", mockController);

      await sseService.broadcastNotification(
        "Server maintenance in 5 minutes",
        {
          maintenance: true,
          duration: "30 minutes",
        },
      );

      expect(mockController.enqueue).toHaveBeenCalledTimes(2);

      const sentData = new TextDecoder().decode(
        (mockController.enqueue as any).mock.calls[0][0],
      );

      expect(sentData).toContain("event: notification");
      expect(sentData).toContain("Server maintenance in 5 minutes");
      expect(sentData).toContain('"maintenance":true');
      expect(sentData).toContain('"duration":"30 minutes"');
    });
  });

  describe("Event Targeting", () => {
    it("should send event to specific users", async () => {
      sseManager.registerClient("user-123", "client-456", mockController);
      sseManager.registerClient("user-456", "client-789", mockController);

      await sseManager.sendEvent({
        eventType: "notification",
        data: {
          message: "Targeted message",
          timestamp: "2024-01-01T00:00:00.000Z",
        },
        targetUsers: ["user-123"],
      });

      expect(mockController.enqueue).toHaveBeenCalledTimes(1);
    });

    it("should broadcast to all connected users", async () => {
      sseManager.registerClient("user-123", "client-456", mockController);
      sseManager.registerClient("user-456", "client-789", mockController);

      await sseManager.sendEvent({
        eventType: "notification",
        data: {
          message: "Broadcast message",
          timestamp: "2024-01-01T00:00:00.000Z",
        },
        broadcast: true,
      });

      expect(mockController.enqueue).toHaveBeenCalledTimes(2);
    });

    it("should handle multiple users per event", async () => {
      sseManager.registerClient("user-123", "client-456", mockController);
      sseManager.registerClient("user-456", "client-789", mockController);
      sseManager.registerClient("user-789", "client-abc", mockController);

      await sseManager.sendEvent({
        eventType: "notification",
        data: {
          message: "Multi-user message",
          timestamp: "2024-01-01T00:00:00.000Z",
        },
        targetUsers: ["user-123", "user-456"],
      });

      expect(mockController.enqueue).toHaveBeenCalledTimes(2);
    });
  });

  describe("Event Data Handling", () => {
    it("should handle complex JSON data", async () => {
      sseManager.registerClient("user-123", "client-456", mockController);

      const complexData = {
        user: {
          id: "user-123",
          name: "John Doe",
          preferences: {
            theme: "dark",
            notifications: true,
          },
        },
        action: "profile_updated",
        metadata: {
          timestamp: "2024-01-01T00:00:00.000Z",
          version: "1.0.0",
        },
      };

      await sseManager.sendEvent({
        eventType: "notification",
        data: {
          ...complexData,
          timestamp: "2024-01-01T00:00:00.000Z",
        },
        targetUsers: ["user-123"],
      });

      const sentData = new TextDecoder().decode(
        (mockController.enqueue as any).mock.calls[0][0],
      );

      expect(sentData).toContain("event: notification");
      expect(sentData).toContain('"name":"John Doe"');
      expect(sentData).toContain('"theme":"dark"');
      expect(sentData).toContain('"action":"profile_updated"');
    });

    it("should handle arrays in event data", async () => {
      sseManager.registerClient("user-123", "client-456", mockController);

      const arrayData = {
        items: ["item1", "item2", "item3"],
        count: 3,
        type: "list_update",
        timestamp: "2024-01-01T00:00:00.000Z",
      };

      await sseManager.sendToUser("user-123", "notification", arrayData);

      const sentData = new TextDecoder().decode(
        (mockController.enqueue as any).mock.calls[0][0],
      );

      expect(sentData).toContain('"items":["item1","item2","item3"]');
      expect(sentData).toContain('"count":3');
    });

    it("should handle null and undefined values", async () => {
      sseManager.registerClient("user-123", "client-456", mockController);

      const dataWithNulls = {
        message: "Test message",
        optionalField: null,
        undefinedField: undefined,
        emptyString: "",
        timestamp: "2024-01-01T00:00:00.000Z",
      };

      await sseManager.sendToUser("user-123", "notification", dataWithNulls);

      const sentData = new TextDecoder().decode(
        (mockController.enqueue as any).mock.calls[0][0],
      );

      expect(sentData).toContain('"message":"Test message"');
      expect(sentData).toContain('"optionalField":null');
      expect(sentData).toContain('"emptyString":""');
      // undefined fields should be omitted
      expect(sentData).not.toContain('"undefinedField"');
    });
  });

  describe("Event Error Handling", () => {
    it("should handle controller errors gracefully", async () => {
      const errorController = {
        ...mockController,
        enqueue: vi.fn().mockImplementation(() => {
          throw new Error("Controller error");
        }),
      };

      sseManager.registerClient("user-123", "client-456", errorController);

      await sseManager.sendToUser("user-123", "notification", {
        message: "Test message",
        timestamp: "2024-01-01T00:00:00.000Z",
      });

      // Should remove the problematic client
      expect(sseManager.getConnectionCount()).toBe(0);
    });

    it("should continue sending to other clients when one fails", async () => {
      const errorController = {
        ...mockController,
        enqueue: vi.fn().mockImplementation(() => {
          throw new Error("Controller error");
        }),
      };

      const workingController = {
        enqueue: vi.fn(),
        close: vi.fn(),
        error: vi.fn(),
      } as unknown as ReadableStreamDefaultController;

      sseManager.registerClient("user-123", "client-456", errorController);
      sseManager.registerClient("user-456", "client-789", workingController);

      await sseManager.broadcast("notification", {
        message: "Test message",
        timestamp: "2024-01-01T00:00:00.000Z",
      });

      // Should have removed the problematic client
      expect(sseManager.getConnectionCount()).toBe(1);
      expect(workingController.enqueue).toHaveBeenCalled();
    });
  });

  describe("Event Performance", () => {
    it("should handle high-frequency events", async () => {
      sseManager.registerClient("user-123", "client-456", mockController);

      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(
          sseManager.sendToUser("user-123", "notification", {
            index: i,
            message: `Update ${i}`,
            timestamp: "2024-01-01T00:00:00.000Z",
          }),
        );
      }

      await Promise.all(promises);

      expect(mockController.enqueue).toHaveBeenCalledTimes(10);
    });

    it("should handle multiple concurrent users", async () => {
      const controllers = [];
      for (let i = 0; i < 5; i++) {
        const controller = {
          enqueue: vi.fn(),
          close: vi.fn(),
          error: vi.fn(),
        } as unknown as ReadableStreamDefaultController;

        sseManager.registerClient(`user-${i}`, `client-${i}`, controller);
        controllers.push(controller);
      }

      await sseManager.broadcast("notification", {
        message: "Broadcast to all users",
        timestamp: "2024-01-01T00:00:00.000Z",
      });

      controllers.forEach((controller) => {
        expect(controller.enqueue).toHaveBeenCalledTimes(1);
      });
    });
  });
});
