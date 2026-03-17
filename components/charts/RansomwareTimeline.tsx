"use client";

import { useMemo } from "react";
import { EmptyState } from "@/components/EmptyState";

interface TimelineEntry {
  family: string;
  incident_count: number;
  first_seen?: string;
  last_seen?: string;
}

interface RansomwareTimelineProps {
  data: TimelineEntry[];
}

export function RansomwareTimeline({ data }: RansomwareTimelineProps) {
  const { minTime, maxTime, maxCount } = useMemo(() => {
    const timestamps: number[] = [];
    let mc = 0;

    for (const d of data) {
      if (d.first_seen) timestamps.push(new Date(d.first_seen).getTime());
      if (d.last_seen) timestamps.push(new Date(d.last_seen).getTime());
      if (d.incident_count > mc) mc = d.incident_count;
    }

    if (timestamps.length === 0) {
      return { minTime: 0, maxTime: 0, maxCount: mc || 1 };
    }

    const min = Math.min(...timestamps);
    const max = Math.max(...timestamps);
    // Add 5% padding on each side
    const padding = (max - min) * 0.05 || 86400000;
    return { minTime: min - padding, maxTime: max + padding, maxCount: mc || 1 };
  }, [data]);

  const range = maxTime - minTime || 1;

  if (!data || data.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="text-lg font-semibold mb-4">Ransomware Family Activity Timeline</h3>
        <EmptyState message="No ransomware timeline data" />
      </div>
    );
  }

  const sorted = [...data].sort((a, b) => b.incident_count - a.incident_count);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  };

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <h3 className="text-lg font-semibold mb-4">Ransomware Family Activity Timeline</h3>
      <div className="space-y-3">
        {/* Axis labels */}
        <div className="flex items-center text-xs text-muted-foreground mb-2">
          <div className="w-32 shrink-0" />
          <div className="flex-1 flex justify-between px-1">
            {minTime > 0 && (
              <>
                <span>{new Date(minTime).toLocaleDateString("en-US", { month: "short", year: "numeric" })}</span>
                <span>{new Date((minTime + maxTime) / 2).toLocaleDateString("en-US", { month: "short", year: "numeric" })}</span>
                <span>{new Date(maxTime).toLocaleDateString("en-US", { month: "short", year: "numeric" })}</span>
              </>
            )}
          </div>
          <div className="w-16 shrink-0 text-right">Count</div>
        </div>

        {sorted.map((entry) => {
          const hasRange = entry.first_seen && entry.last_seen;
          const hasSingle = !hasRange && (entry.first_seen || entry.last_seen);
          const opacity = 0.3 + (entry.incident_count / maxCount) * 0.7;

          let leftPct = 0;
          let widthPct = 0;

          if (hasRange) {
            const start = new Date(entry.first_seen!).getTime();
            const end = new Date(entry.last_seen!).getTime();
            leftPct = ((start - minTime) / range) * 100;
            widthPct = Math.max(((end - start) / range) * 100, 0.5);
          } else if (hasSingle) {
            const t = new Date((entry.first_seen || entry.last_seen)!).getTime();
            leftPct = ((t - minTime) / range) * 100;
          }

          return (
            <div key={entry.family} className="flex items-center group">
              <div className="w-32 shrink-0 text-sm font-medium truncate pr-2 capitalize" title={entry.family}>
                {entry.family.replace(/_/g, " ")}
              </div>
              <div className="flex-1 relative h-6 bg-zinc-900/50 rounded">
                {hasRange ? (
                  <div
                    className="absolute top-1 bottom-1 rounded transition-all duration-300 group-hover:brightness-125"
                    style={{
                      left: `${leftPct}%`,
                      width: `${widthPct}%`,
                      backgroundColor: `rgba(239, 68, 68, ${opacity})`,
                      minWidth: "4px",
                    }}
                    title={`${entry.family}: ${formatDate(entry.first_seen!)} — ${formatDate(entry.last_seen!)} (${entry.incident_count} incidents)`}
                  />
                ) : hasSingle ? (
                  <div
                    className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full transition-all duration-300 group-hover:scale-125"
                    style={{
                      left: `${leftPct}%`,
                      backgroundColor: `rgba(239, 68, 68, ${opacity})`,
                    }}
                    title={`${entry.family}: ${formatDate((entry.first_seen || entry.last_seen)!)} (${entry.incident_count} incidents)`}
                  />
                ) : (
                  <div
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: `rgba(239, 68, 68, ${opacity})` }}
                    title={`${entry.family}: ${entry.incident_count} incidents (no date info)`}
                  />
                )}
              </div>
              <div className="w-16 shrink-0 text-sm text-muted-foreground text-right tabular-nums">
                {entry.incident_count}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
