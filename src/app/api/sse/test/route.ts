import { NextRequest } from "next/server";
import { auth } from "@/features/auth/handlers";

/**
 * Test endpoint to demonstrate sending SSE events
 * This shows how backend modules can use the SSE service
 */
export async function GET() {
  return new Response(
    JSON.stringify({ 
      message: "SSE Test API is working",
      timestamp: new Date().toISOString()
    }),
    { 
      status: 200, 
      headers: { "Content-Type": "application/json" } 
    }
  );
}

export async function POST(request: NextRequest) {
  try {
    // Get session for authentication
    const session = await auth();
    
    // For testing purposes, allow anonymous users
    // In production, you would require authentication
    const userId = session?.user?.id ?? "anonymous";

    const body = await request.json() as Record<string, unknown>;
    const { type, ...data } = body;

    // Import clients from the SSE route
    const sseModule = await import("../route");
    const clients = sseModule.clients as Map<string, {
      id: string;
      userId?: string;
      controller: ReadableStreamDefaultController;
      lastActivity: number;
    }>;

    if (!clients) {
      return new Response(
        JSON.stringify({ error: "SSE clients not available" }),
        { 
          status: 500, 
          headers: { "Content-Type": "application/json" } 
        }
      );
    }

    let success = false;
    let sentCount = 0;

    // Send different types of events based on the request
    switch (type) {
      case "notification":
        // Send to all clients of this user
        for (const [clientId, client] of clients.entries()) {
          if (client.userId === userId) {
            const event = {
              type: "notification",
              data: {
                title: (data.title as string) ?? "Test Notification",
                message: (data.message as string) ?? "This is a test notification",
                level: (data.level as string) ?? "info",
                actionUrl: data.actionUrl as string,
              },
              timestamp: Date.now(),
            };
            
            const eventData = `event: ${event.type}\ndata: ${JSON.stringify(event.data)}\nid: ${Date.now()}\ntimestamp: ${event.timestamp}\n\n`;
            client.controller.enqueue(new TextEncoder().encode(eventData));
            sentCount++;
          }
        }
        success = sentCount > 0;
        break;

      case "user_update":
        for (const [clientId, client] of clients.entries()) {
          if (client.userId === userId) {
            const event = {
              type: "user_update",
              data: {
                userId: userId,
                field: (data.field as string) ?? "status",
                value: (data.value as string) ?? "Updated",
              },
              timestamp: Date.now(),
            };
            
            const eventData = `event: ${event.type}\ndata: ${JSON.stringify(event.data)}\nid: ${Date.now()}\ntimestamp: ${event.timestamp}\n\n`;
            client.controller.enqueue(new TextEncoder().encode(eventData));
            sentCount++;
          }
        }
        success = sentCount > 0;
        break;

      case "reel_upload":
        for (const [clientId, client] of clients.entries()) {
          if (client.userId === userId) {
            const event = {
              type: "reel_upload",
              data: {
                reelId: (data.reelId as string) ?? "test-reel-123",
                status: (data.status as string) ?? "completed",
                progress: data.progress as number,
                error: data.error as string,
              },
              timestamp: Date.now(),
            };
            
            const eventData = `event: ${event.type}\ndata: ${JSON.stringify(event.data)}\nid: ${Date.now()}\ntimestamp: ${event.timestamp}\n\n`;
            client.controller.enqueue(new TextEncoder().encode(eventData));
            sentCount++;
          }
        }
        success = sentCount > 0;
        break;

      case "search_result":
        for (const [clientId, client] of clients.entries()) {
          if (client.userId === userId) {
            const event = {
              type: "search_result",
              data: {
                query: (data.query as string) ?? "test query",
                results: (data.results as unknown[]) ?? [],
                total: (data.total as number) ?? 0,
              },
              timestamp: Date.now(),
            };
            
            const eventData = `event: ${event.type}\ndata: ${JSON.stringify(event.data)}\nid: ${Date.now()}\ntimestamp: ${event.timestamp}\n\n`;
            client.controller.enqueue(new TextEncoder().encode(eventData));
            sentCount++;
          }
        }
        success = sentCount > 0;
        break;

      case "system_message":
        for (const [clientId, client] of clients.entries()) {
          if (client.userId === userId) {
            const event = {
              type: "system_message",
              data: {
                message: (data.message as string) ?? "Test system message",
                code: data.code as string,
              },
              timestamp: Date.now(),
            };
            
            const eventData = `event: ${event.type}\ndata: ${JSON.stringify(event.data)}\nid: ${Date.now()}\ntimestamp: ${event.timestamp}\n\n`;
            client.controller.enqueue(new TextEncoder().encode(eventData));
            sentCount++;
          }
        }
        success = sentCount > 0;
        break;

      case "ping":
        for (const [clientId, client] of clients.entries()) {
          if (client.userId === userId) {
            const event = {
              type: "ping",
              data: { timestamp: Date.now() },
              timestamp: Date.now(),
            };
            
            const eventData = `event: ${event.type}\ndata: ${JSON.stringify(event.data)}\nid: ${Date.now()}\ntimestamp: ${event.timestamp}\n\n`;
            client.controller.enqueue(new TextEncoder().encode(eventData));
            sentCount++;
          }
        }
        success = sentCount > 0;
        break;

      default:
        return new Response(
          JSON.stringify({ error: "Invalid event type" }),
          { 
            status: 400, 
            headers: { "Content-Type": "application/json" } 
          }
        );
    }

    if (success) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `${type} event sent successfully to ${sentCount} client(s)`,
          timestamp: new Date().toISOString()
        }),
        { 
          status: 200, 
          headers: { "Content-Type": "application/json" } 
        }
      );
    } else {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "No active SSE connections found for user" 
        }),
        { 
          status: 404, 
          headers: { "Content-Type": "application/json" } 
        }
      );
    }

  } catch (error) {
    console.error("Error in SSE test endpoint:", error);
    return new Response(
      JSON.stringify({ 
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error"
      }),
      { 
        status: 500, 
        headers: { "Content-Type": "application/json" } 
      }
    );
  }
} 