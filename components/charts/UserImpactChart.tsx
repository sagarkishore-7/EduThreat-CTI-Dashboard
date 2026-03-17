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
import { EmptyState } from "@/components/EmptyState";
import { formatNumber } from "@/lib/utils";

interface UserImpactData {
  students: number | null;
  staff: number | null;
  faculty: number | null;
  total_individuals: number | null;
  incidents_with_data: number;
}

interface UserImpactChartProps {
  data: UserImpactData;
}

const CATEGORY_COLORS: Record<string, string> = {
  Students: "#06b6d4",
  Staff: "#8b5cf6",
  Faculty: "#22c55e",
};

export function UserImpactChart({ data }: UserImpactChartProps) {
  if (
    !data ||
    (data.students === null && data.staff === null && data.faculty === null)
  ) {
    return (
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="text-lg font-semibold mb-4">User Impact</h3>
        <EmptyState message="No user impact data available" />
      </div>
    );
  }

  const barData = [
    { name: "Students", value: data.students ?? 0 },
    { name: "Staff", value: data.staff ?? 0 },
    { name: "Faculty", value: data.faculty ?? 0 },
  ].filter((d) => d.value > 0);

  if (barData.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="text-lg font-semibold mb-4">User Impact</h3>
        <EmptyState message="No user impact data available" />
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <h3 className="text-lg font-semibold mb-4">User Impact</h3>

      {/* Total individuals callout */}
      {data.total_individuals !== null && (
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 mb-5 text-center">
          <p className="text-xs text-zinc-400 mb-1">Total Individuals Affected</p>
          <p className="text-3xl font-bold text-cyan-400">
            {formatNumber(data.total_individuals)}
          </p>
          <p className="text-xs text-zinc-500 mt-1">
            Across {formatNumber(data.incidents_with_data)} incidents with reported data
          </p>
        </div>
      )}

      {/* Horizontal bar chart */}
      <div className="h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={barData}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={false} />
            <XAxis
              type="number"
              stroke="#71717a"
              fontSize={12}
              tickFormatter={(v: number) => formatNumber(v)}
            />
            <YAxis
              dataKey="name"
              type="category"
              stroke="#71717a"
              fontSize={12}
              width={80}
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
              formatter={(value: number) => [formatNumber(value), "Affected"]}
            />
            <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={28}>
              {barData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={CATEGORY_COLORS[entry.name] ?? "#06b6d4"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
