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
import { formatAttackCategory } from "@/lib/utils";

interface AttackVectorData {
  category: string;
  count: number;
  percentage: number;
}

interface AttackVectorDonutProps {
  data: AttackVectorData[];
}

const COLORS = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#06b6d4",
  "#8b5cf6",
  "#ec4899",
];

export function AttackVectorDonut({ data }: AttackVectorDonutProps) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="text-lg font-semibold mb-4">
          Attack Vector Distribution
        </h3>
        <EmptyState message="No attack vector data available" />
      </div>
    );
  }

  const chartData = data.map((item) => ({
    name: formatAttackCategory(item.category),
    value: item.count,
    percentage: item.percentage,
  }));

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <h3 className="text-lg font-semibold mb-4">
        Attack Vector Distribution
      </h3>
      <div className="h-[350px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="45%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={2}
              dataKey="value"
              nameKey="name"
            >
              {chartData.map((_entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[index % COLORS.length]}
                  stroke="transparent"
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
              formatter={(value: number, _name: string, props: unknown) => {
                const payload = (
                  props as { payload?: { percentage?: number } }
                )?.payload;
                const pct = payload?.percentage ?? 0;
                return [`${value} (${pct.toFixed(1)}%)`, "Incidents"];
              }}
            />
            <Legend
              verticalAlign="bottom"
              wrapperStyle={{ fontSize: 12, color: "#a1a1aa", paddingTop: 16 }}
              formatter={(value: string) => (
                <span className="text-muted-foreground text-xs">{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
