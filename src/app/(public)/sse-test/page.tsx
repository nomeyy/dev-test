import { getSession } from "@/features/auth";
import SSETestClient from "./SSETestClient";

export default async function SSETestPage() {
  let session;
  try {
    session = await getSession();
  } catch {
    session = null;
  }

  return (
    <div className="min-h-screen bg-transparent">
      <div className="container mx-auto space-y-8 p-6">
        <div className="text-center">
          <h1 className="mb-4 text-4xl font-bold text-white">
            SSE Testing Dashboard
          </h1>
          <p className="text-lg text-blue-100">
            Real-time Server-Sent Events testing interface
          </p>
          {session?.user && (
            <p className="mt-3 inline-block rounded-full bg-blue-900/30 px-4 py-2 text-sm text-blue-200">
              Signed in as: {session.user.name ?? session.user.email}
            </p>
          )}
        </div>

        <SSETestClient />
      </div>
    </div>
  );
}
