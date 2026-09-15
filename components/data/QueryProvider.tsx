"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { retryRead } from "@/lib/client/urologicsQuery";

function AccountQueries({ children }: { children: ReactNode }) {
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: {
    staleTime: 30_000,
    gcTime: 60_000,
    retry: retryRead,
    retryDelay: attempt => Math.min(1000 * 2 ** attempt, 4000),
  } } }));
  useEffect(() => {
    const invalidate = () => { void client.invalidateQueries(); };
    const clear = () => client.clear();
    window.addEventListener("urologics:access-changed", invalidate);
    window.addEventListener("urologics:logout", clear);
    return () => {
      window.removeEventListener("urologics:access-changed", invalidate);
      window.removeEventListener("urologics:logout", clear);
      client.clear();
    };
  }, [client]);
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

export default function QueryProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  return <AccountQueries key={user?.uid || "guest"}>{children}</AccountQueries>;
}
