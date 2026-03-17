"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { EmptyState } from "@/components/EmptyState";

interface SystemImpactData {
  category: string;
  count: number;
}

interface SystemImpactChartProps {
  data: SystemImpactData[];
}

export function SystemImpactChart({ data }: SystemImpactChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="text-lg font-semibold mb-4">System Impact</h3>
        <EmptyState message="No system impact data available" />
      </div>
    );
  }

  const chartData = data.map((item) => ({
    name: item.category,
    count: item.count,
  }));

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <h3 className="text-lg font-semibold mb-4">System Impact</h3>
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#27272a"
              horizontal={false}
            />
            <XAxis
              type="number"
              stroke="#71717a"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <YAxis
              dataKey="name"
              type="category"
              stroke="#71717a"
              fontSize={11}
              width={140}
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
              formatter={(value: number) => [`${value}`, "Incidents"]}
            />
            <Bar
              dataKey="count"
              fill="#06b6d4"
              radius={[0, 4, 4, 0]}
              name="Incidents"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
