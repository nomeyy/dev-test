import { sendToClient, broadcast } from "@/lib/sseManager";

export async function POST(req: Request) {
  try {
    const { loginUser, targetClientId, event, data } = await req.json();

    if (targetClientId) {
      // Send to a specific client
      sendToClient(targetClientId, event, data);
    } else {
      // Broadcast to all connected clients
      broadcast(loginUser, event, data);
    }

    return Response.json({ success: true });
  } catch (err: any) {
    console.error("Error in /api/notify:", err);
    return new Response("Internal Server Error", { status: 500 });
  }
}
