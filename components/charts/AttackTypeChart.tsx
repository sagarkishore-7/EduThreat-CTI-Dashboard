"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
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
  "#ef4444", // red - ransomware
  "#f97316", // orange
  "#eab308", // yellow
  "#22c55e", // green
  "#06b6d4", // cyan
  "#8b5cf6", // purple
  "#ec4899", // pink
  "#f43f5e", // rose
];

export function AttackTypeChart({ data }: AttackTypeChartProps) {
  const chartData = data.slice(0, 8).map((item) => ({
    name: formatAttackCategory(item.category),
    value: item.count,
    percentage: item.percentage,
  }));

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <h3 className="text-lg font-semibold mb-4">Attack Types Distribution</h3>
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={false} />
            <XAxis type="number" stroke="#71717a" fontSize={12} />
            <YAxis
              dataKey="name"
              type="category"
              stroke="#71717a"
              fontSize={11}
              width={120}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#111118",
                border: "1px solid #27272a",
                borderRadius: "8px",
              }}
              labelStyle={{ color: "#06b6d4" }}
              itemStyle={{ color: "#e4e4e7" }}
              formatter={(value: number, name: string, props: { payload: { percentage: number } }) => [
                `${value} (${props.payload.percentage}%)`,
                "Incidents",
              ]}
            />
            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

