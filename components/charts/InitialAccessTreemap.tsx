"use client";

import { EmptyState } from "@/components/EmptyState";
import { formatAttackCategory } from "@/lib/utils";

interface InitialAccessData {
  category: string;
  count: number;
  percentage: number;
}

interface InitialAccessTreemapProps {
  data: InitialAccessData[];
}

export function InitialAccessTreemap({ data }: InitialAccessTreemapProps) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="text-lg font-semibold mb-4">Initial Access Methods</h3>
        <EmptyState message="No initial access data available" />
      </div>
    );
  }

  const maxCount = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <h3 className="text-lg font-semibold mb-4">Initial Access Methods</h3>
      <div className="space-y-3">
        {data.map((item, index) => {
          const widthPct = Math.max((item.count / maxCount) * 100, 2);
          const hue = 190 + index * 15; // gradient from cyan (~190) to purple range

          return (
            <div key={item.category}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-muted-foreground truncate mr-2">
                  {formatAttackCategory(item.category)}
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-sm font-medium text-zinc-200">
                    {item.count}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    ({item.percentage.toFixed(1)}%)
                  </span>
                </div>
              </div>
              <div className="h-6 w-full bg-zinc-800/50 rounded-md overflow-hidden">
                <div
                  className="h-full rounded-md transition-all duration-500 ease-out"
                  style={{
                    width: `${widthPct}%`,
                    background: `linear-gradient(90deg, hsl(${hue}, 80%, 50%), hsl(${hue + 30}, 70%, 45%))`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
