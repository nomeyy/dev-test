"use client";

import { createContext, type ReactNode } from "react";
import { SessionProvider } from "next-auth/react";
import { type Session } from "next-auth";

// Create a typed context for nullable session data
export const PublicSessionContext = createContext<{ session: Session | null }>({
  session: null,
});

export function PublicSessionProvider({
  children,
  session,
}: {
  children: ReactNode;
  session: Session | null;
}) {
  return (
    <SessionProvider session={session}>
      <PublicSessionContext.Provider value={{ session }}>
        {children}
      </PublicSessionContext.Provider>
    </SessionProvider>
  );
}
