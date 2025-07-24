import { sseManager } from "@/lib/sse/SSEManager";
import type { NextApiRequest, NextApiResponse } from "next";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { id, message, event } = req.body as {
    id?: string;
    message?: string;
    event: string;
  };

  if (!id || !message) {
    res.status(400).json({ error: "Missing id or message" });
    return;
  }

  console.log(`Sending message to client ${id}:`, message);

  //sseManager.sendEvent(id, 'message', { message });
  sseManager.sendEventToTopic(id, event, message);
  res.status(200).json({ status: "sent" });
}
