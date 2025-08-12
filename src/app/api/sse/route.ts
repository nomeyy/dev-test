import { handleAuthSSE } from "@/features/sse";

export const runtime = "nodejs"; // ensure streaming

export async function GET(request: Request) {
  return handleAuthSSE(request);
}
