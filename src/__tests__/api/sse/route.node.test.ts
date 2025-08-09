import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "../../../app/api/sse/route";
import { sseManager } from "@/lib/sse";

// Mock dependencies
vi.mock("@/lib/sse", () => ({
  sseManager: {
    registerClient: vi.fn(),
    removeClient: vi.fn(),
    getConnectionCount: vi.fn(),
  },
}));

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

describe("SSE Route", () => {
  let mockRequest: NextRequest;
  let mockController: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockController = {
      enqueue: vi.fn(),
      close: vi.fn(),
      error: vi.fn(),
    };

    vi.mocked(sseManager.registerClient).mockImplementation(() => ({
      userId: "test-user-123",
      clientId: "test-client-456",
      controller: mockController,
      connectedAt: new Date(),
      lastActivity: new Date(),
    }));
    vi.mocked(sseManager.removeClient).mockImplementation(() => true);
    vi.mocked(sseManager.getConnectionCount).mockReturnValue(1);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/sse", () => {
    it("should establish SSE connection with userId from query parameter", async () => {
      mockRequest = new NextRequest(
        "http://localhost:3000/api/sse?userId=test-user-123&clientId=test-client-456",
      );

      const response = await GET(mockRequest);

      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toBe("text/event-stream");
      expect(response.headers.get("Cache-Control")).toBe("no-cache");
      expect(response.headers.get("Connection")).toBe("keep-alive");
      expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");

      expect(sseManager.registerClient).toHaveBeenCalledWith(
        "test-user-123",
        "test-client-456",
        expect.any(Object),
      );
    });

    it("should return 400 when userId is not provided", async () => {
      mockRequest = new NextRequest("http://localhost:3000/api/sse");

      const response = await GET(mockRequest);

      expect(response.status).toBe(400);
      const responseData = await response.json();
      expect(responseData.success).toBe(false);
      expect(responseData.message).toBe("userId parameter is required");
      expect(responseData.error).toBe("MISSING_USER_ID");
    });

    it("should generate clientId when not provided", async () => {
      mockRequest = new NextRequest(
        "http://localhost:3000/api/sse?userId=test-user-123",
      );

      const response = await GET(mockRequest);

      expect(response.status).toBe(200);
      expect(sseManager.registerClient).toHaveBeenCalledWith(
        "test-user-123",
        expect.stringMatching(/^client_\d+$/),
        expect.any(Object),
      );
    });

    it("should return SSE stream with proper headers", async () => {
      mockRequest = new NextRequest(
        "http://localhost:3000/api/sse?userId=test-user-123&clientId=test-client-456",
      );

      const response = await GET(mockRequest);

      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toBe("text/event-stream");
      expect(response.headers.get("Cache-Control")).toBe("no-cache");
      expect(response.headers.get("Connection")).toBe("keep-alive");
      expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
      expect(response.headers.get("Access-Control-Allow-Headers")).toBe(
        "Cache-Control",
      );
    });

    it("should handle connection establishment", async () => {
      mockRequest = new NextRequest(
        "http://localhost:3000/api/sse?userId=test-user-123&clientId=test-client-456",
      );

      const response = await GET(mockRequest);

      expect(response.status).toBe(200);
      expect(sseManager.registerClient).toHaveBeenCalledTimes(1);
    });

    it("should handle multiple connections with different userIds", async () => {
      const request1 = new NextRequest(
        "http://localhost:3000/api/sse?userId=user-1&clientId=client-1",
      );
      const request2 = new NextRequest(
        "http://localhost:3000/api/sse?userId=user-2&clientId=client-2",
      );

      const response1 = await GET(request1);
      const response2 = await GET(request2);

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);

      expect(sseManager.registerClient).toHaveBeenCalledWith(
        "user-1",
        "client-1",
        expect.any(Object),
      );
      expect(sseManager.registerClient).toHaveBeenCalledWith(
        "user-2",
        "client-2",
        expect.any(Object),
      );
    });

    it("should handle connection with custom clientId", async () => {
      mockRequest = new NextRequest(
        "http://localhost:3000/api/sse?userId=test-user-123&clientId=custom-client-id",
      );

      const response = await GET(mockRequest);

      expect(response.status).toBe(200);
      expect(sseManager.registerClient).toHaveBeenCalledWith(
        "test-user-123",
        "custom-client-id",
        expect.any(Object),
      );
    });
  });
});
