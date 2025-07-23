import type { NextApiRequest, NextApiResponse } from "next";
import { sseManager } from "../../features/sse-demo/manager";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.status(405).end();
    return;
  }

  // Use session/user id or fallback to random id
  const id = req.query.id?.toString() || Math.random().toString(36).slice(2);

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "Access-Control-Allow-Origin": "*",
  });

  res.write("\n");
  console.log(`[SSE] Client connected: ${id}`);
  sseManager.addClient(id, res);

  req.on("close", () => {
    console.log(`[SSE] Client disconnected: ${id}`);
    sseManager.removeClient(id);
  });
}
