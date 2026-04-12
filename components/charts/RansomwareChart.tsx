"use client";

import type { CountByCategory } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Skull } from "lucide-react";

interface RansomwareChartProps {
  data: CountByCategory[];
}

const RANK_COLORS = [
  { bar: "bg-red-500",    text: "text-red-400",    border: "border-red-500/30" },
  { bar: "bg-orange-500", text: "text-orange-400",  border: "border-orange-500/30" },
  { bar: "bg-amber-500",  text: "text-amber-400",   border: "border-amber-500/30" },
  { bar: "bg-yellow-500", text: "text-yellow-400",  border: "border-yellow-500/30" },
  { bar: "bg-cyan-500",   text: "text-cyan-400",    border: "border-cyan-500/30" },
  { bar: "bg-violet-500", text: "text-violet-400",  border: "border-violet-500/30" },
  { bar: "bg-pink-500",   text: "text-pink-400",    border: "border-pink-500/30" },
  { bar: "bg-blue-500",   text: "text-blue-400",    border: "border-blue-500/30" },
  { bar: "bg-emerald-500",text: "text-emerald-400", border: "border-emerald-500/30" },
  { bar: "bg-zinc-500",   text: "text-zinc-400",    border: "border-zinc-500/30" },
];

export function RansomwareChart({ data }: RansomwareChartProps) {
  const top = data.slice(0, 10);
  const maxCount = Math.max(...top.map((d) => d.count), 1);

  return (
    <div className="bg-[#0c0c18] border border-zinc-800 rounded-lg p-4 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-medium mb-0.5">
            Threat Groups
          </p>
          <h3 className="text-sm font-semibold text-zinc-200">Ransomware Families</h3>
        </div>
        <Skull className="w-4 h-4 text-red-500/60" />
      </div>

      <div className="flex-1 space-y-2.5 overflow-y-auto">
        {top.map((item, index) => {
          const colors = RANK_COLORS[index] ?? RANK_COLORS[RANK_COLORS.length - 1];
          const pct = (item.count / maxCount) * 100;
          const label = item.category.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

          return (
            <div key={item.category} className="group">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={cn(
                    "text-[9px] font-mono font-bold w-5 text-right shrink-0",
                    index < 3 ? colors.text : "text-zinc-600"
                  )}>
                    #{index + 1}
                  </span>
                  <span className="text-[11px] font-medium text-zinc-300 truncate">
                    {label}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <span className="text-[11px] font-mono font-bold text-zinc-200">
                    {item.count}
                  </span>
                  <span className={cn(
                    "text-[9px] font-mono px-1 py-0.5 rounded border",
                    colors.text, colors.border,
                    "bg-current/5"
                  )}>
                    {item.percentage}%
                  </span>
                </div>
              </div>

              <div className="h-1.5 bg-zinc-900 rounded-full overflow-hidden ml-7">
                <div
                  className={cn("h-full rounded-full transition-all duration-700", colors.bar)}
                  style={{ width: `${pct}%`, opacity: 0.75 + (1 - index / 10) * 0.25 }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
