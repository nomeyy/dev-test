import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  SSEManagerService,
  getSSEManager,
  cleanupSSEManager,
} from "../services/sse-manager";
import type { SSEClient } from "../types";

// Mock ReadableStreamDefaultController
const mockController = {
  enqueue: vi.fn(),
  close: vi.fn(),
  error: vi.fn(),
};

// Mock AbortController
const mockAbortController = {
  signal: { aborted: false },
  abort: vi.fn(),
};

describe("SSEManagerService", () => {
  let sseManager: SSEManagerService;

  beforeEach(() => {
    cleanupSSEManager();
    sseManager = new SSEManagerService();
    vi.useFakeTimers();
    // Clear any initial calls from constructor
    vi.clearAllMocks();
  });

  afterEach(() => {
    sseManager.destroy();
    vi.useRealTimers();
  });

  describe("Client Management", () => {
    it("should add a client successfully", () => {
      const client: SSEClient = {
        id: "test-client-1",
        userId: "user123",
        sessionId: "session456",
        controller: mockController as any,
        abortController: mockAbortController as any,
        lastPing: Date.now(),
        isAlive: true,
      };

      sseManager.addClient(client);

      expect(sseManager.getClientCount()).toBe(1);
      expect(sseManager.getActiveClients()).toHaveLength(1);
      const activeClients = sseManager.getActiveClients();
      expect(activeClients[0]?.id).toBe("test-client-1");
    });

    it("should remove a client successfully", () => {
      const client: SSEClient = {
        id: "test-client-1",
        controller: mockController as any,
        abortController: mockAbortController as any,
        lastPing: Date.now(),
        isAlive: true,
      };

      sseManager.addClient(client);
      expect(sseManager.getClientCount()).toBe(1);

      sseManager.removeClient("test-client-1");
      expect(sseManager.getClientCount()).toBe(0);
      expect(mockAbortController.abort).toHaveBeenCalled();
    });

    it("should handle removing non-existent client", () => {
      sseManager.removeClient("non-existent");
      expect(sseManager.getClientCount()).toBe(0);
    });
  });

  describe("Message Broadcasting", () => {
    it("should broadcast message to all clients", () => {
      const client1: SSEClient = {
        id: "client-1",
        controller: mockController as any,
        abortController: mockAbortController as any,
        lastPing: Date.now(),
        isAlive: true,
      };

      const client2: SSEClient = {
        id: "client-2",
        controller: mockController as any,
        abortController: mockAbortController as any,
        lastPing: Date.now(),
        isAlive: true,
      };

      sseManager.addClient(client1);
      sseManager.addClient(client2);

      // Clear the initial connection messages
      vi.clearAllMocks();

      sseManager.broadcast("test_event", { message: "Hello World" });

      // Verify that enqueue was called for both clients
      expect(mockController.enqueue).toHaveBeenCalledTimes(2);
    });

    it("should send message to specific user", () => {
      const userClient: SSEClient = {
        id: "user-client",
        userId: "user123",
        controller: mockController as any,
        abortController: mockAbortController as any,
        lastPing: Date.now(),
        isAlive: true,
      };

      const otherClient: SSEClient = {
        id: "other-client",
        userId: "user456",
        controller: mockController as any,
        abortController: mockAbortController as any,
        lastPing: Date.now(),
        isAlive: true,
      };

      sseManager.addClient(userClient);
      sseManager.addClient(otherClient);

      // Clear the initial connection messages
      vi.clearAllMocks();

      sseManager.sendToUser("user123", "user_event", {
        message: "User specific",
      });

      // Should only send to the user123 client
      expect(mockController.enqueue).toHaveBeenCalledTimes(1);
    });

    it("should send message to specific session", () => {
      const sessionClient: SSEClient = {
        id: "session-client",
        sessionId: "session123",
        controller: mockController as any,
        abortController: mockAbortController as any,
        lastPing: Date.now(),
        isAlive: true,
      };

      const otherClient: SSEClient = {
        id: "other-client",
        sessionId: "session456",
        controller: mockController as any,
        abortController: mockAbortController as any,
        lastPing: Date.now(),
        isAlive: true,
      };

      sseManager.addClient(sessionClient);
      sseManager.addClient(otherClient);

      // Clear the initial connection messages
      vi.clearAllMocks();

      sseManager.sendToSession("session123", "session_event", {
        message: "Session specific",
      });

      // Should only send to the session123 client
      expect(mockController.enqueue).toHaveBeenCalledTimes(1);
    });

    it("should send message to specific client", () => {
      const client: SSEClient = {
        id: "specific-client",
        controller: mockController as any,
        abortController: mockAbortController as any,
        lastPing: Date.now(),
        isAlive: true,
      };

      sseManager.addClient(client);

      // Clear the initial connection message
      vi.clearAllMocks();

      sseManager.sendToClient("specific-client", "client_event", {
        message: "Client specific",
      });

      expect(mockController.enqueue).toHaveBeenCalledTimes(1);
    });

    it("should handle sending to non-existent client", () => {
      sseManager.sendToClient("non-existent", "test_event", {
        message: "Test",
      });
      expect(mockController.enqueue).not.toHaveBeenCalled();
    });
  });

  describe("Message Dispatching", () => {
    it("should dispatch message to all clients by default", () => {
      const client: SSEClient = {
        id: "test-client",
        controller: mockController as any,
        abortController: mockAbortController as any,
        lastPing: Date.now(),
        isAlive: true,
      };

      sseManager.addClient(client);

      // Clear the initial connection message
      vi.clearAllMocks();

      sseManager.sendMessage({
        event: "test_event",
        data: { message: "Test" },
      });

      expect(mockController.enqueue).toHaveBeenCalledTimes(1);
    });

    it("should dispatch message to specific target", () => {
      const client: SSEClient = {
        id: "test-client",
        userId: "user123",
        controller: mockController as any,
        abortController: mockAbortController as any,
        lastPing: Date.now(),
        isAlive: true,
      };

      sseManager.addClient(client);

      // Clear the initial connection message
      vi.clearAllMocks();

      sseManager.sendMessage({
        event: "test_event",
        data: { message: "Test" },
        target: "user",
        targetId: "user123",
      });

      expect(mockController.enqueue).toHaveBeenCalledTimes(1);
    });
  });

  describe("Heartbeat System", () => {
    it("should send heartbeat messages", () => {
      const client: SSEClient = {
        id: "test-client",
        controller: mockController as any,
        abortController: mockAbortController as any,
        lastPing: Date.now(),
        isAlive: true,
      };

      sseManager.addClient(client);

      // Advance time to trigger heartbeat
      vi.advanceTimersByTime(30000);

      expect(mockController.enqueue).toHaveBeenCalled();
    });

    it("should cleanup dead connections", () => {
      // Create a manager without heartbeat for this test
      const testManager = new SSEManagerService();

      const client: SSEClient = {
        id: "test-client",
        controller: mockController as any,
        abortController: mockAbortController as any,
        lastPing: Date.now(),
        isAlive: true,
      };

      testManager.addClient(client);

      // Set the lastPing to be old after the initial connection message
      client.lastPing = Date.now() - 130000; // 2+ minutes ago

      // Manually trigger cleanup
      (testManager as any).cleanupDeadConnections();

      expect(testManager.getClientCount()).toBe(0);

      testManager.destroy();
    });
  });

  describe("Singleton Pattern", () => {
    it("should return the same instance", () => {
      const instance1 = getSSEManager();
      const instance2 = getSSEManager();

      expect(instance1).toBe(instance2);
    });

    it("should cleanup properly", () => {
      const instance = getSSEManager();
      const client: SSEClient = {
        id: "test-client",
        controller: mockController as any,
        abortController: mockAbortController as any,
        lastPing: Date.now(),
        isAlive: true,
      };

      instance.addClient(client);
      expect(instance.getClientCount()).toBe(1);

      cleanupSSEManager();
      expect(instance.getClientCount()).toBe(0);
    });
  });
});
