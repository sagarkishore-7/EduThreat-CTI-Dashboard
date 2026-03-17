"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { EmptyState } from "@/components/EmptyState";
import { formatNumber } from "@/lib/utils";

interface TransparencyLevel {
  level: string;
  count: number;
}

interface TransparencyData {
  total: number;
  disclosed_count: number;
  disclosure_rate: number;
  avg_delay_days: number | null;
  levels: TransparencyLevel[];
}

interface TransparencyPanelProps {
  data: TransparencyData;
}

const LEVEL_COLORS: Record<string, string> = {
  full: "#22c55e",
  partial: "#f97316",
  minimal: "#ef4444",
  none: "#71717a",
};

const FALLBACK_COLORS = ["#06b6d4", "#8b5cf6", "#22c55e", "#f97316", "#ef4444"];

function getLevelColor(level: string, index: number): string {
  return LEVEL_COLORS[level.toLowerCase()] ?? FALLBACK_COLORS[index % FALLBACK_COLORS.length];
}

export function TransparencyPanel({ data }: TransparencyPanelProps) {
  if (!data || data.total === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="text-lg font-semibold mb-4">Transparency & Disclosure</h3>
        <EmptyState message="No transparency data available" />
      </div>
    );
  }

  const donutData = data.levels.map((item) => ({
    name: item.level.charAt(0).toUpperCase() + item.level.slice(1),
    value: item.count,
  }));

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <h3 className="text-lg font-semibold mb-4">Transparency & Disclosure</h3>
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left: Donut chart */}
        <div className="flex-1 h-[260px]">
          {donutData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={donutData}
                  cx="50%"
                  cy="45%"
                  innerRadius={50}
                  outerRadius={85}
                  dataKey="value"
                  nameKey="name"
                  paddingAngle={2}
                  stroke="none"
                >
                  {donutData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={getLevelColor(data.levels[index].level, index)}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#111118",
                    border: "1px solid #27272a",
                    borderRadius: "8px",
                  }}
                  labelStyle={{ color: "#06b6d4" }}
                  itemStyle={{ color: "#e4e4e7" }}
                  formatter={(value: number) => [`${value} incidents`, "Count"]}
                />
                <Legend
                  verticalAlign="bottom"
                  iconType="circle"
                  iconSize={8}
                  formatter={(value: string) => (
                    <span className="text-xs text-zinc-300">{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState message="No transparency level breakdown available" />
          )}
        </div>

        {/* Right: Key metrics */}
        <div className="flex-1 flex flex-col justify-center gap-4">
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
            <p className="text-xs text-zinc-400 mb-1">Disclosure Rate</p>
            <p className="text-3xl font-bold text-cyan-400">
              {data.disclosure_rate.toFixed(1)}%
            </p>
            <p className="text-xs text-zinc-500 mt-1">
              {formatNumber(data.disclosed_count)} of {formatNumber(data.total)} incidents disclosed
            </p>
          </div>
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
            <p className="text-xs text-zinc-400 mb-1">Avg Disclosure Delay</p>
            <p className="text-3xl font-bold text-orange-400">
              {data.avg_delay_days !== null
                ? `${data.avg_delay_days.toFixed(1)} days`
                : "N/A"}
            </p>
            <p className="text-xs text-zinc-500 mt-1">
              Time from incident to public disclosure
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
