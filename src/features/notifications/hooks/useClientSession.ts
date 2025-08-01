"use client";

import { useEffect, useState } from "react";
import type { Session } from "next-auth";

export function useClientSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    let mounted = true;

    fetch("/api/session")
      .then((res) => res.json())
      .then((data) => {
        if (mounted) setSession(data?.session ?? null);
      })
      .catch((e) => {
        if (mounted) setError(e);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  return { session, loading, error };
}
