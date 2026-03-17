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

interface AttackTrendDataPoint {
  month: string;
  attack_category: string | null;
  count: number;
}

interface AttackTrendChartProps {
  data: AttackTrendDataPoint[];
}

const CATEGORY_COLORS: Record<string, string> = {
  ransomware: "#ef4444",
  data_breach: "#8b5cf6",
  phishing: "#f97316",
  unauthorized_access: "#06b6d4",
  other: "#6b7280",
};

function getCategoryColor(category: string): string {
  const key = category.toLowerCase().replace(/\s+/g, "_");
  return CATEGORY_COLORS[key] ?? CATEGORY_COLORS.other;
}

function formatCategoryLabel(category: string): string {
  return category
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function AttackTrendChart({ data }: AttackTrendChartProps) {
  const { chartData, categories } = useMemo(() => {
    if (!data || data.length === 0) return { chartData: [], categories: [] };

    const categorySet = new Set<string>();
    const monthMap = new Map<string, Record<string, number>>();

    for (const point of data) {
      const cat = point.attack_category ?? "other";
      categorySet.add(cat);

      if (!monthMap.has(point.month)) {
        monthMap.set(point.month, {});
      }
      const row = monthMap.get(point.month)!;
      row[cat] = (row[cat] ?? 0) + point.count;
    }

    const sortedMonths = Array.from(monthMap.keys()).sort();
    const cats = Array.from(categorySet);

    const pivoted = sortedMonths.map((month) => {
      const row: Record<string, string | number> = { month };
      const values = monthMap.get(month)!;
      for (const cat of cats) {
        row[cat] = values[cat] ?? 0;
      }
      return row;
    });

    return { chartData: pivoted, categories: cats };
  }, [data]);

  if (!data || data.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="text-lg font-semibold mb-4">Attack Trends Over Time</h3>
        <EmptyState message="No trend data available" />
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <h3 className="text-lg font-semibold mb-4">Attack Trends Over Time</h3>
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
              formatter={(value: string) => formatCategoryLabel(value)}
            />
            {categories.map((cat) => (
              <Area
                key={cat}
                type="monotone"
                dataKey={cat}
                stackId="1"
                stroke={getCategoryColor(cat)}
                fill={getCategoryColor(cat)}
                fillOpacity={0.4}
                name={cat}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
