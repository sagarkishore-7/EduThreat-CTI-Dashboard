"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { CountByCategory } from "@/lib/api";
import { formatAttackCategory } from "@/lib/utils";

interface AttackTypeChartProps {
  data: CountByCategory[];
}

const COLORS = [
  "#ef4444",
  "#f97316",
  "#f59e0b",
  "#06b6d4",
  "#8b5cf6",
  "#ec4899",
  "#22c55e",
  "#3b82f6",
];

function CustomTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ value: number; payload: { percentage: number } }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="px-3 py-2 rounded border text-xs font-mono"
      style={{ background: "#0c0c18", borderColor: "#1e1e3a" }}>
      <div className="text-cyan-400 mb-1">{label}</div>
      <div className="text-zinc-200">
        <span className="text-zinc-500 mr-1">incidents</span>
        <span className="font-bold">{payload[0].value}</span>
        <span className="text-zinc-600 ml-2">({payload[0].payload.percentage}%)</span>
      </div>
    </div>
  );
}

export function AttackTypeChart({ data }: AttackTypeChartProps) {
  const chartData = data.slice(0, 8).map((item) => ({
    name: formatAttackCategory(item.category),
    value: item.count,
    percentage: item.percentage,
  }));

  return (
    <div className="bg-[#0c0c18] border border-zinc-800 rounded-lg p-4 h-full">
      <div className="mb-4">
        <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-medium mb-0.5">
          Attack Classification
        </p>
        <h3 className="text-sm font-semibold text-zinc-200">Attack Type Distribution</h3>
      </div>

      <div className="h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 0, right: 40, left: 0, bottom: 0 }}
          >
            <XAxis
              type="number"
              stroke="#3f3f5a"
              fontSize={10}
              tickLine={false}
              axisLine={{ stroke: "#1a1a2e" }}
              fontFamily="monospace"
            />
            <YAxis
              dataKey="name"
              type="category"
              stroke="#3f3f5a"
              fontSize={10}
              width={110}
              tickLine={false}
              axisLine={false}
              tick={{ fill: "#71717a" }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="value" radius={[0, 3, 3, 0]} maxBarSize={16}>
              {chartData.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[index % COLORS.length]}
                  fillOpacity={0.85}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
