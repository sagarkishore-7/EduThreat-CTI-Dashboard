"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { CountByCategory } from "@/lib/api";
import { getCountryFlag } from "@/lib/utils";

interface CountryChartProps {
  data: CountByCategory[];
}

// Helper to find flag emoji from data
function getFlagForCountry(data: CountByCategory[], countryName: string): string | undefined {
  return data.find(d => d.category === countryName)?.flag_emoji;
}

const COLORS = [
  "#06b6d4", // cyan
  "#8b5cf6", // purple
  "#f43f5e", // rose
  "#22c55e", // green
  "#f59e0b", // amber
  "#ec4899", // pink
  "#3b82f6", // blue
  "#ef4444", // red
];

export function CountryChart({ data }: CountryChartProps) {
  const chartData = data.slice(0, 8).map((item) => ({
    name: item.category,
    value: item.count,
    percentage: item.percentage,
  }));

  const total = chartData.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <h3 className="text-lg font-semibold mb-4">Incidents by Country</h3>
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={2}
              dataKey="value"
            >
              {chartData.map((entry, index) => (
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
              formatter={(value: number, name: string) => {
                const flagEmoji = getFlagForCountry(data, name);
                return [
                  `${value} (${((value / total) * 100).toFixed(1)}%)`,
                  `${getCountryFlag(name, flagEmoji)} ${name}`,
                ];
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      {/* Legend */}
      <div className="grid grid-cols-2 gap-2 mt-4">
        {chartData.slice(0, 6).map((item, index) => (
          <div key={item.name} className="flex items-center gap-2 text-sm">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: COLORS[index % COLORS.length] }}
            />
            <span className="text-muted-foreground">
              {getCountryFlag(item.name, getFlagForCountry(data, item.name))} {item.name}
            </span>
            <span className="text-foreground ml-auto">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

