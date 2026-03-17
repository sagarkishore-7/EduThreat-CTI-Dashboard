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

interface InstitutionTypeData {
  category: string;
  count: number;
  percentage: number;
}

interface InstitutionTypeChartProps {
  data: InstitutionTypeData[];
}

const COLORS = ["#06b6d4", "#8b5cf6", "#22c55e", "#f97316", "#ef4444", "#ec4899"];

export function InstitutionTypeChart({ data }: InstitutionTypeChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="text-lg font-semibold mb-4">Institution Type Distribution</h3>
        <EmptyState message="No institution type data available" />
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
      <h3 className="text-lg font-semibold mb-4">Institution Type Distribution</h3>
      <div className="h-[350px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="45%"
              innerRadius={60}
              outerRadius={100}
              dataKey="value"
              nameKey="name"
              paddingAngle={2}
              stroke="none"
            >
              {chartData.map((_entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[index % COLORS.length]}
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
                const payload = (props as { payload?: { percentage?: number } })?.payload;
                const percentage = payload?.percentage ?? 0;
                return [`${value} (${percentage}%)`, "Incidents"];
              }}
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
      </div>
    </div>
  );
}
