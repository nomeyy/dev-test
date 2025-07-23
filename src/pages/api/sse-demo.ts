import { sseManager } from "../../features/sse-demo/manager";
import type { NextApiRequest, NextApiResponse } from "next";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // Get id and event from query params, fallback to demo values
  const id = req.query.id?.toString() || "demo-user";
  const event = req.query.event?.toString() || "demo";
  console.log(`Sending ${event} event to ${id}`);
  sseManager.sendEvent(id, event, {
    msg: `Hello from server at ${new Date().toISOString()}`,
  });
  res.status(200).json({ ok: true });
}
