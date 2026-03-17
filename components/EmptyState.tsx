"use client";

import { AlertTriangle } from "lucide-react";

interface EmptyStateProps {
  message?: string;
  subMessage?: string;
}

export function EmptyState({
  message = "No data available",
  subMessage = "Enrich more incidents to populate this visualization",
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-center p-6">
      <AlertTriangle className="w-8 h-8 text-muted-foreground/50 mb-3" />
      <p className="text-sm font-medium text-muted-foreground">{message}</p>
      <p className="text-xs text-muted-foreground/70 mt-1">{subMessage}</p>
    </div>
  );
}
