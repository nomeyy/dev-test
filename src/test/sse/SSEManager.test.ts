import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { sseManager } from "@/lib/sse";
import type { SSEClient, SSEEvent } from "@/types/sse";

describe("SSEManager", () => {
  let mockClient: SSEClient;
  let mockResponse: any;

  beforeEach(() => {
    mockResponse = {
      write: vi.fn(),
      end: vi.fn(),
    };

    mockClient = {
      id: "test-client-1",
      userId: "user-123",
      response: mockResponse,
      isAlive: true,
    };
  });

  afterEach(() => {
    // Clean up any clients after each test
    vi.clearAllMocks();
  });

  describe("addClient", () => {
    it("should add a client successfully", () => {
      sseManager.addClient(mockClient);
      expect(sseManager.getClientCount()).toBe(1);
    });
  });

  describe("sendEvent", () => {
    it("should send event to active client", () => {
      sseManager.addClient(mockClient);

      const event: SSEEvent = {
        event: "notification",
        data: { message: "Test notification" },
      };

      const result = sseManager.sendEvent("test-client-1", event);
      expect(result).toBe(true);
      expect(mockResponse.write).toHaveBeenCalled();
    });

    it("should return false for inactive client", () => {
      const event: SSEEvent = {
        event: "notification",
        data: { message: "Test notification" },
      };

      const result = sseManager.sendEvent("non-existent-client", event);
      expect(result).toBe(false);
    });
  });

  describe("broadcast", () => {
    it("should broadcast to all connected clients", () => {
      const mockClient2 = { ...mockClient, id: "test-client-2" };

      sseManager.addClient(mockClient);
      sseManager.addClient(mockClient2);

      const event: SSEEvent = {
        event: "broadcast",
        data: { message: "Broadcast message" },
      };

      const successCount = sseManager.broadcast(event);
      expect(successCount).toBe(2);
    });
  });

  describe("removeClient", () => {
    it("should remove client and clean up resources", () => {
      sseManager.addClient(mockClient);
      expect(sseManager.getClientCount()).toBe(1);

      sseManager.removeClient("test-client-1");
      expect(sseManager.getClientCount()).toBe(0);
      expect(mockResponse.end).toHaveBeenCalled();
    });
  });
});
