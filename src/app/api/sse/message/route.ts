import { NextRequest } from "next/server";
import { clients, cleanupDeadConnections } from "../route";

export async function POST(request: NextRequest) {
  try {
    const { clientId, type, data, timestamp } = await request.json();

    // First cleanup any dead connections
    const deadClients = cleanupDeadConnections();
    if (deadClients.length > 0) {
      console.log("Cleaned up dead clients:", deadClients);
    }

    // Allow server-initiated broadcasts (clientId can be "server" or any identifier)
    // If it's a real client, mark them as active
    const client = clients.get(clientId);
    if (client) {
      client.lastActive = Date.now();
    }

    // Determine target clients based on recipients field and broadcast flag
    let targetClients: Map<string, any> = new Map();

    if (data?.broadcast === true) {
      // If broadcast is explicitly true, send to all clients
      targetClients = clients;
      console.log(
        "Broadcasting message to all active clients (broadcast flag)",
      );
    } else if (
      data?.recipients &&
      Array.isArray(data.recipients) &&
      data.recipients.length > 0
    ) {
      // Send only to specified recipients
      console.log("Looking for recipients:", data.recipients);
      console.log("Available clients:", Array.from(clients.keys()));

      data.recipients.forEach((recipientId: string) => {
        // First try to find by exact client ID
        let recipientClient = clients.get(recipientId);

        // If not found by client ID, try to find by userId
        if (!recipientClient) {
          console.log(
            `Client ID ${recipientId} not found, searching by userId...`,
          );
          for (const [clientId, client] of clients.entries()) {
            console.log(
              `Checking client ${clientId} with userId ${client.userId}`,
            );
            if (client.userId === recipientId) {
              recipientClient = client;
              console.log(`Found client by userId: ${clientId}`);
              break;
            }
          }
        }

        if (recipientClient) {
          targetClients.set(recipientId, recipientClient);
          console.log(`Added recipient ${recipientId} to target clients`);
        } else {
          console.log(`Recipient not found: ${recipientId}`);
        }
      });
      console.log(
        `Targeted message to ${targetClients.size} specific users:`,
        data.recipients,
      );

      // If no specific recipients found, fallback to broadcast
      if (targetClients.size === 0) {
        console.log("No specific recipients found, falling back to broadcast");
        targetClients = clients;
      }
    } else {
      // Fallback: send to all active clients (broadcast)
      targetClients = clients;
      console.log("Broadcasting message to all active clients (fallback)");
    }

    // Send to target clients only
    const successfulSends: string[] = [];
    const failedSends: string[] = [];

    targetClients.forEach((c, id) => {
      try {
        c.controller.enqueue(
          `event: message\ndata: ${JSON.stringify({
            from: clientId,
            type,
            data,
            timestamp,
            activeConnections: clients.size,
            isTargeted: data?.recipients ? true : false,
            recipients: data?.recipients || null,
          })}\n\n`,
        );
        successfulSends.push(id);
      } catch (e) {
        failedSends.push(id);
      }
    });

    // Cleanup failed sends
    if (failedSends.length > 0) {
      failedSends.forEach((id) => clients.delete(id));
      console.log("Removed dead connections during send:", failedSends);
    }

    return new Response(
      JSON.stringify({
        success: true,
        sentTo: successfulSends.length,
        deadRemoved: failedSends.length,
        totalActive: clients.size,
        isTargeted: data?.recipients ? true : false,
        recipients: data?.recipients || null,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: "Invalid request",
        details: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
