import { SSEUtils } from "@/lib/sse/sse-utils";

export async function GET() {
  try {
    const stats = SSEUtils.getStats();

    return new Response(JSON.stringify(stats), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Stats error:", error);
    return new Response("Internal server error", { status: 500 });
  }
}
