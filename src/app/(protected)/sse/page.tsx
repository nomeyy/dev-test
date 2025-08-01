// src/app/(protected)/sse/page.tsx
import React from "react";
import { redirect } from "next/navigation";
import { SseTestView } from "@/features/notifications";
import { getSession } from "@/features/auth";

const SsePage = async () => {
  const session = await getSession();

  if (!session?.user?.id) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black to-zinc-900 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-6">SSE Debug / Test</h1>
        <SseTestView session={session} />
      </div>
    </div>
  );
};

export default SsePage;
