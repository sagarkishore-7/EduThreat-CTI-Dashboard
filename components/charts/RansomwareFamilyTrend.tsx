"use client";

import { useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { EmptyState } from "@/components/EmptyState";

interface RansomwareFamilyTrendProps {
  data: {
    families: string[];
    data: { month: string; family: string; count: number }[];
  };
}

const FAMILY_COLORS = [
  "#ef4444",
  "#8b5cf6",
  "#f97316",
  "#06b6d4",
  "#ec4899",
  "#f59e0b",
  "#22c55e",
  "#3b82f6",
];

function formatLabel(label: string): string {
  return label
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function RansomwareFamilyTrend({ data }: RansomwareFamilyTrendProps) {
  const { chartData, families } = useMemo(() => {
    if (!data || !data.data || data.data.length === 0) {
      return { chartData: [], families: [] };
    }

    const familyList = data.families ?? [];
    const monthMap = new Map<string, Record<string, number>>();

    for (const point of data.data) {
      if (!monthMap.has(point.month)) {
        monthMap.set(point.month, {});
      }
      const row = monthMap.get(point.month)!;
      row[point.family] = (row[point.family] ?? 0) + point.count;
    }

    const sortedMonths = Array.from(monthMap.keys()).sort();
    const pivoted = sortedMonths.map((month) => {
      const row: Record<string, string | number> = { month };
      const values = monthMap.get(month)!;
      for (const family of familyList) {
        row[family] = values[family] ?? 0;
      }
      return row;
    });

    return { chartData: pivoted, families: familyList };
  }, [data]);

  if (!data || !data.data || data.data.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="text-lg font-semibold mb-4">Ransomware Family Trends</h3>
        <EmptyState message="No ransomware family data available" />
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <h3 className="text-lg font-semibold mb-4">Ransomware Family Trends</h3>
      <div className="h-[350px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
            <XAxis
              dataKey="month"
              stroke="#71717a"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="#71717a"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#111118",
                border: "1px solid #27272a",
                borderRadius: "8px",
              }}
              labelStyle={{ color: "#06b6d4" }}
              itemStyle={{ color: "#e4e4e7" }}
            />
            <Legend
              wrapperStyle={{ fontSize: 12, color: "#a1a1aa" }}
              formatter={(value: string) => formatLabel(value)}
            />
            {families.map((family, i) => (
              <Area
                key={family}
                type="monotone"
                dataKey={family}
                stackId="1"
                stroke={FAMILY_COLORS[i % FAMILY_COLORS.length]}
                fill={FAMILY_COLORS[i % FAMILY_COLORS.length]}
                fillOpacity={0.4}
                name={family}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
