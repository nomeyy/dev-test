import { sseManager } from "@/lib/sse/SSEManager";
import type { ServerResponse } from "http";
import type { NextApiRequest, NextApiResponse } from "next";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.status(405).end();
    return;
  }

  const clientId = req.query.id as string;
  const eventParam = req.query.events?.toString();

  if (!clientId) {
    res.status(400).json({ error: "Missing client ID" });
    return;
  }
  const topics = eventParam ? eventParam.split(",") : [];
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "Content-Encoding": "identity",
  });
  res.flushHeaders();

  sseManager.addClient(clientId, res as ServerResponse, topics);

  req.on("close", () => {
    console.log(`Client ${clientId} disconnected`);
    sseManager.removeClient(clientId);
  });
}
