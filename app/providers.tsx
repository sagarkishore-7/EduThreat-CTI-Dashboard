"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute — avoid redundant refetches
            gcTime: 10 * 60 * 1000, // keep cached pages for 10 min → instant back-nav
            refetchOnWindowFocus: false,
            refetchOnReconnect: false,
            retry: 1, // fail fast instead of 3x exponential backoff
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

