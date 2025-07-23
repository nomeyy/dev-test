import { DemoSSEClient } from "../../../features/sse-demo";
import { getSession } from "@/features/auth";

export default async function SSETestPage() {
  const session = await getSession();
  return (
    <main>
      <h1>SSE Demo</h1>
      <DemoSSEClient id={session?.user.id ?? null} event="demo" />
    </main>
  );
}
