"use client";

import type { CountByCategory } from "@/lib/api";
import { cn } from "@/lib/utils";

interface RansomwareChartProps {
  data: CountByCategory[];
}

const ransomwareColors: Record<string, string> = {
  lockbit: "bg-red-500",
  blackcat_alphv: "bg-purple-500",
  cl0p_clop: "bg-orange-500",
  akira: "bg-cyan-500",
  play: "bg-yellow-500",
  black_basta: "bg-pink-500",
  medusa: "bg-green-500",
  rhysida: "bg-blue-500",
  royal: "bg-rose-500",
  hive: "bg-amber-500",
};

export function RansomwareChart({ data }: RansomwareChartProps) {
  const maxCount = Math.max(...data.map((d) => d.count));

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <h3 className="text-lg font-semibold mb-4">Ransomware Families</h3>
      <div className="space-y-3">
        {data.slice(0, 10).map((item, index) => {
          const colorClass =
            ransomwareColors[item.category.toLowerCase()] || "bg-gray-500";
          const percentage = (item.count / maxCount) * 100;

          return (
            <div key={item.category} className="group">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium capitalize">
                  {item.category.replace(/_/g, " ")}
                </span>
                <span className="text-sm text-muted-foreground">
                  {item.count} ({item.percentage}%)
                </span>
              </div>
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    colorClass
                  )}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

