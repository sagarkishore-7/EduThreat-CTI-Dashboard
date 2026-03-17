"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { EmptyState } from "@/components/EmptyState";
import { formatCurrency } from "@/lib/utils";

interface FinancialImpactData {
  year: string | null;
  ransom_cost: number | null;
  recovery_cost: number | null;
  legal_cost: number | null;
  notification_cost: number | null;
  incident_count: number;
}

interface FinancialImpactChartProps {
  data: FinancialImpactData[];
}

const COST_COLORS = {
  ransom_cost: "#ef4444",
  recovery_cost: "#f97316",
  legal_cost: "#8b5cf6",
  notification_cost: "#06b6d4",
};

const COST_LABELS: Record<string, string> = {
  ransom_cost: "Ransom",
  recovery_cost: "Recovery",
  legal_cost: "Legal",
  notification_cost: "Notification",
};

export function FinancialImpactChart({ data }: FinancialImpactChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="text-lg font-semibold mb-4">Financial Impact by Year</h3>
        <EmptyState message="No financial impact data available" />
      </div>
    );
  }

  const chartData = data
    .filter((item) => item.year !== null)
    .map((item) => ({
      year: item.year!,
      ransom_cost: item.ransom_cost ?? 0,
      recovery_cost: item.recovery_cost ?? 0,
      legal_cost: item.legal_cost ?? 0,
      notification_cost: item.notification_cost ?? 0,
      incident_count: item.incident_count,
    }));

  if (chartData.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="text-lg font-semibold mb-4">Financial Impact by Year</h3>
        <EmptyState message="No financial impact data available" />
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <h3 className="text-lg font-semibold mb-4">Financial Impact by Year</h3>
      <div className="h-[350px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
            <XAxis
              dataKey="year"
              stroke="#71717a"
              fontSize={12}
              tickLine={false}
            />
            <YAxis
              stroke="#71717a"
              fontSize={12}
              tickFormatter={(value: number) => formatCurrency(value)}
              width={90}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#111118",
                border: "1px solid #27272a",
                borderRadius: "8px",
              }}
              labelStyle={{ color: "#06b6d4" }}
              itemStyle={{ color: "#e4e4e7" }}
              formatter={(value: number, name: string) => [
                formatCurrency(value),
                COST_LABELS[name] ?? name,
              ]}
              labelFormatter={(label: string) => `Year: ${label}`}
            />
            <Legend
              iconType="square"
              iconSize={10}
              formatter={(value: string) => (
                <span className="text-xs text-zinc-300">
                  {COST_LABELS[value] ?? value}
                </span>
              )}
            />
            <Bar
              dataKey="ransom_cost"
              stackId="costs"
              fill={COST_COLORS.ransom_cost}
              radius={[0, 0, 0, 0]}
            />
            <Bar
              dataKey="recovery_cost"
              stackId="costs"
              fill={COST_COLORS.recovery_cost}
            />
            <Bar
              dataKey="legal_cost"
              stackId="costs"
              fill={COST_COLORS.legal_cost}
            />
            <Bar
              dataKey="notification_cost"
              stackId="costs"
              fill={COST_COLORS.notification_cost}
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
