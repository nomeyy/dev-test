import { describe, it, expect, vi, beforeEach } from "vitest";
import { sseManager } from "../manager";

function createMockRes() {
  return { write: vi.fn() } as any;
}

describe("SSEManager", () => {
  beforeEach(() => {
    // Clean up clients before each test
    (sseManager as any).clients.clear();
  });

  it("adds and removes clients", () => {
    const res = createMockRes();
    sseManager.addClient("user1", res);
    expect((sseManager as any).clients.has("user1")).toBe(true);
    sseManager.removeClient("user1");
    expect((sseManager as any).clients.has("user1")).toBe(false);
  });

  it("sendEvent writes correct data", () => {
    const res = createMockRes();
    sseManager.addClient("user2", res);
    sseManager.sendEvent("user2", "test-event", { foo: "bar" });
    expect(res.write).toHaveBeenCalledWith(
      'event: test-event\ndata: {"foo":"bar"}\n\n',
    );
  });

  it("broadcast writes to all clients", () => {
    const res1 = createMockRes();
    const res2 = createMockRes();
    sseManager.addClient("userA", res1);
    sseManager.addClient("userB", res2);
    sseManager.broadcast("broadcast", { hello: "world" });
    expect(res1.write).toHaveBeenCalledWith(
      'event: broadcast\ndata: {"hello":"world"}\n\n',
    );
    expect(res2.write).toHaveBeenCalledWith(
      'event: broadcast\ndata: {"hello":"world"}\n\n',
    );
  });

  it("handles sending to non-existent client gracefully", () => {
    // Should not throw
    expect(() => sseManager.sendEvent("nope", "event", {})).not.toThrow();
  });
});
