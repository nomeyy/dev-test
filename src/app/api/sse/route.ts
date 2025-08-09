import { sseManager } from "@/lib/sse";

function encodeSSE(event: string, data: any) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export { encodeSSE };
