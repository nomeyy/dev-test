import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { sseManager } from "@/lib/sse/sse-manager";

describe("SSE Manager", () => {
  beforeEach(() => {
    // Clear any existing clients and reset the manager
    (sseManager as any).clients.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Clean up
    (sseManager as any).clients.clear();
  });

  it("should register a client successfully", async () => {
    // Skip this test in browser environment due to ReadableStream limitations
    if (typeof window !== "undefined") {
      expect(true).toBe(true); // Placeholder assertion
      return;
    }

    const mockRequest = new NextRequest("http://localhost:3000/api/sse");
    const response = await sseManager.registerClient(mockRequest, "test-user");

    expect(response).toBeInstanceOf(Response);
    expect(response.headers.get("Content-Type")).toBe("text/event-stream");
  });

  it("should send message to specific user", () => {
    // Mock client registration
    const mockClient = {
      id: "test-client",
      userId: "test-user",
      controller: {
        enqueue: vi.fn(),
      },
    } as any;

    // Add mock client to manager
    (sseManager as any).clients.set("test-client", mockClient);

    const result = sseManager.sendToUser("test-user", {
      event: "test",
      data: { message: "Hello" },
    });

    expect(result).toBe(1);
    expect(mockClient.controller.enqueue).toHaveBeenCalled();
  });

  it("should broadcast message to all clients", () => {
    // Clear any existing clients first
    (sseManager as any).clients.clear();

    // Mock multiple clients
    const mockClient1 = {
      id: "client1",
      controller: { enqueue: vi.fn() },
    } as any;
    const mockClient2 = {
      id: "client2",
      controller: { enqueue: vi.fn() },
    } as any;

    (sseManager as any).clients.set("client1", mockClient1);
    (sseManager as any).clients.set("client2", mockClient2);

    const result = sseManager.broadcast({
      event: "broadcast",
      data: { message: "Hello all" },
    });

    expect(result).toBe(2);
    expect(mockClient1.controller.enqueue).toHaveBeenCalled();
    expect(mockClient2.controller.enqueue).toHaveBeenCalled();
  });

  it("should send message to specific session", () => {
    // Mock client registration
    const mockClient = {
      id: "test-client",
      sessionId: "test-session",
      controller: {
        enqueue: vi.fn(),
      },
    } as any;

    // Add mock client to manager
    (sseManager as any).clients.set("test-client", mockClient);

    const result = sseManager.sendToSession("test-session", {
      event: "test",
      data: { message: "Hello" },
    });

    expect(result).toBe(1);
    expect(mockClient.controller.enqueue).toHaveBeenCalled();
  });

  it("should remove client successfully", () => {
    // Mock client
    const mockClient = {
      id: "test-client",
      controller: {
        close: vi.fn(),
      },
    } as any;

    (sseManager as any).clients.set("test-client", mockClient);

    const result = sseManager.removeClient("test-client");

    expect(result).toBe(true);
    expect(mockClient.controller.close).toHaveBeenCalled();
    expect((sseManager as any).clients.has("test-client")).toBe(false);
  });

  it("should return false when removing non-existent client", () => {
    const result = sseManager.removeClient("non-existent");
    expect(result).toBe(false);
  });

  it("should get correct statistics", () => {
    // Clear any existing clients first
    (sseManager as any).clients.clear();

    // Mock multiple clients
    const mockClient1 = {
      id: "client1",
      userId: "user1",
      sessionId: "session1",
    } as any;
    const mockClient2 = {
      id: "client2",
      userId: "user1",
      sessionId: "session2",
    } as any;
    const mockClient3 = {
      id: "client3",
      userId: "user2",
      sessionId: "session3",
    } as any;

    (sseManager as any).clients.set("client1", mockClient1);
    (sseManager as any).clients.set("client2", mockClient2);
    (sseManager as any).clients.set("client3", mockClient3);

    const stats = sseManager.getStats();

    expect(stats.totalClients).toBe(3);
    expect(stats.uniqueUsers).toBe(2);
    expect(stats.uniqueSessions).toBe(3);
    expect(stats.userConnections).toEqual({
      user1: 2,
      user2: 1,
    });
    expect(stats.sessionConnections).toEqual({
      session1: 1,
      session2: 1,
      session3: 1,
    });
  });

  it("should handle client send errors gracefully", () => {
    // Clear any existing clients first
    (sseManager as any).clients.clear();

    // Mock client with error
    const mockClient = {
      id: "test-client",
      controller: {
        enqueue: vi.fn().mockImplementation(() => {
          throw new Error("Send error");
        }),
        close: vi.fn(),
      },
    } as any;

    (sseManager as any).clients.set("test-client", mockClient);

    // Verify client exists before error
    expect((sseManager as any).clients.has("test-client")).toBe(true);

    const result = sseManager.sendToClient("test-client", {
      event: "test",
      data: { message: "Hello" },
    });

    expect(result).toBe(false);
    // Client should be removed after error
    expect((sseManager as any).clients.has("test-client")).toBe(false);
    // Controller close should be called
    expect(mockClient.controller.close).toHaveBeenCalled();
  });

  it("should format SSE message correctly", () => {
    const event = {
      event: "test_event",
      data: { message: "Hello World" },
      id: "123",
      retry: 5000,
    };

    const result = (sseManager as any).formatSSEMessage(event);

    expect(result).toContain("id: 123");
    expect(result).toContain("retry: 5000");
    expect(result).toContain("event: test_event");
    expect(result).toContain('data: {"message":"Hello World"}');
  });

  it("should generate unique client IDs", () => {
    const id1 = (sseManager as any).generateClientId();
    const id2 = (sseManager as any).generateClientId();

    expect(id1).not.toBe(id2);
    expect(id1).toMatch(/^sse_\d+_[a-z0-9]+$/);
    expect(id2).toMatch(/^sse_\d+_[a-z0-9]+$/);
  });
});
