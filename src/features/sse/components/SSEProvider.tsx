"use client";

import { SessionProvider } from "next-auth/react";

export function SSEProvider({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
