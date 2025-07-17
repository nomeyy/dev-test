import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createSSEService } from "@/lib/sse";
import type { SSEClient } from "@/lib/sse";

// Mock ReadableStreamDefaultController
const mockController = {
  enqueue: vi.fn(),
  close: vi.fn(),
  error: vi.fn(),
  desiredSize: 1,
};

// Mock Response
const mockResponse = new Response();

describe("SSEService", () => {
  let sseService: ReturnType<typeof createSSEService>;

  beforeEach(() => {
    sseService = createSSEService();
    vi.clearAllMocks();
  });

  afterEach(() => {
    sseService.cleanup();
  });

  describe("Client Management", () => {
    it("should add a client successfully", () => {
      const client: SSEClient = {
        id: "test-client-1",
        userId: "user123",
        sessionId: "session456",
        response: mockResponse,
        controller: mockController,
        lastActivity: Date.now(),
        isConnected: true,
      };

      sseService.addClient(client);
      expect(sseService.getClientCount()).toBe(1);
      expect(sseService.getActiveClients()).toHaveLength(1);
    });

    it("should remove a client successfully", () => {
      const client: SSEClient = {
        id: "test-client-1",
        userId: "user123",
        sessionId: "session456",
        response: mockResponse,
        controller: mockController,
        lastActivity: Date.now(),
        isConnected: true,
      };

      sseService.addClient(client);
      expect(sseService.getClientCount()).toBe(1);

      sseService.removeClient("test-client-1");
      expect(sseService.getClientCount()).toBe(0);
      expect(sseService.getActiveClients()).toHaveLength(0);
    });

    it("should handle removing non-existent client", () => {
      expect(() => sseService.removeClient("non-existent")).not.toThrow();
      expect(sseService.getClientCount()).toBe(0);
    });
  });

  describe("Message Broadcasting", () => {
    it("should broadcast message to all clients", async () => {
      const client1: SSEClient = {
        id: "client-1",
        response: mockResponse,
        controller: mockController,
        lastActivity: Date.now(),
        isConnected: true,
      };

      const client2: SSEClient = {
        id: "client-2",
        response: mockResponse,
        controller: mockController,
        lastActivity: Date.now(),
        isConnected: true,
      };

      sseService.addClient(client1);
      sseService.addClient(client2);

      await sseService.broadcast("test-event", { message: "Hello World" });

      expect(mockController.enqueue).toHaveBeenCalledTimes(2);
    });

    it("should not send to excluded clients", async () => {
      const client1: SSEClient = {
        id: "client-1",
        response: mockResponse,
        controller: mockController,
        lastActivity: Date.now(),
        isConnected: true,
      };

      const client2: SSEClient = {
        id: "client-2",
        response: mockResponse,
        controller: mockController,
        lastActivity: Date.now(),
        isConnected: true,
      };

      sseService.addClient(client1);
      sseService.addClient(client2);

      await sseService.broadcast("test-event", { message: "Hello World" }, [
        "client-1",
      ]);

      expect(mockController.enqueue).toHaveBeenCalledTimes(1);
    });
  });

  describe("User-Specific Messages", () => {
    it("should send message to specific user", async () => {
      const userClient: SSEClient = {
        id: "user-client",
        userId: "user123",
        response: mockResponse,
        controller: mockController,
        lastActivity: Date.now(),
        isConnected: true,
      };

      const otherClient: SSEClient = {
        id: "other-client",
        userId: "user456",
        response: mockResponse,
        controller: mockController,
        lastActivity: Date.now(),
        isConnected: true,
      };

      sseService.addClient(userClient);
      sseService.addClient(otherClient);

      await sseService.sendToUser("user123", "user-event", {
        message: "User specific",
      });

      expect(mockController.enqueue).toHaveBeenCalledTimes(1);
    });

    it("should handle user with no clients", async () => {
      await expect(
        sseService.sendToUser("non-existent-user", "test", { message: "test" }),
      ).resolves.not.toThrow();
    });
  });

  describe("Error Handling", () => {
    it("should handle controller errors gracefully", async () => {
      const errorController = {
        ...mockController,
        enqueue: vi.fn().mockImplementation(() => {
          throw new Error("Controller error");
        }),
      };

      const client: SSEClient = {
        id: "error-client",
        response: mockResponse,
        controller: errorController,
        lastActivity: Date.now(),
        isConnected: true,
      };

      sseService.addClient(client);

      await sseService.broadcast("test-event", { message: "Test" });

      // Client should be removed due to error
      expect(sseService.getClientCount()).toBe(0);
    });

    it("should handle disconnected clients", async () => {
      const client: SSEClient = {
        id: "disconnected-client",
        response: mockResponse,
        controller: mockController,
        lastActivity: Date.now(),
        isConnected: false,
      };

      sseService.addClient(client);

      await sseService.broadcast("test-event", { message: "Test" });

      // Should not send to disconnected client
      expect(mockController.enqueue).not.toHaveBeenCalled();
    });
  });

  describe("Message Formatting", () => {
    it("should format SSE messages correctly", async () => {
      const client: SSEClient = {
        id: "format-client",
        response: mockResponse,
        controller: mockController,
        lastActivity: Date.now(),
        isConnected: true,
      };

      sseService.addClient(client);

      await sseService.broadcast("test-event", { message: "Hello World" });

      // Verify the message format
      const callArgs = mockController.enqueue.mock
        .calls[0]?.[0] as AllowSharedBufferSource;
      const messageText = new TextDecoder().decode(callArgs);

      expect(messageText).toContain("event: test-event");
      expect(messageText).toContain('data: {"message":"Hello World"}');
      expect(messageText).toMatch(
        /^id: \d+\nevent: test-event\ndata: \{"message":"Hello World"\}\n\n$/,
      );
    });
  });

  describe("Cleanup", () => {
    it("should cleanup resources properly", () => {
      const client: SSEClient = {
        id: "cleanup-client",
        response: mockResponse,
        controller: mockController,
        lastActivity: Date.now(),
        isConnected: true,
      };

      sseService.addClient(client);
      expect(sseService.getClientCount()).toBe(1);

      sseService.cleanup();
      expect(sseService.getClientCount()).toBe(0);
      expect(mockController.close).toHaveBeenCalled();
    });
  });
});
