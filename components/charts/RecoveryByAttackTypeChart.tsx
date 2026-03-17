"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { EmptyState } from "@/components/EmptyState";

interface RecoveryByAttackTypeData {
  attack_category: string;
  avg_recovery_days: number | null;
  avg_downtime_days: number | null;
  incident_count: number;
}

interface RecoveryByAttackTypeChartProps {
  data: RecoveryByAttackTypeData[];
}

function formatLabel(label: string): string {
  return label
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function RecoveryByAttackTypeChart({
  data,
}: RecoveryByAttackTypeChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="text-lg font-semibold mb-4">
          Recovery Time by Attack Type
        </h3>
        <EmptyState message="No recovery time data available" />
      </div>
    );
  }

  const chartData = data.map((d) => ({
    ...d,
    attack_category: formatLabel(d.attack_category),
    avg_recovery_days: d.avg_recovery_days ?? 0,
    avg_downtime_days: d.avg_downtime_days ?? 0,
  }));

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <h3 className="text-lg font-semibold mb-4">
        Recovery Time by Attack Type
      </h3>
      <div className="h-[350px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 10, right: 30, left: 10, bottom: 5 }}
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
              tickFormatter={(v: number) => `${v}d`}
            />
            <YAxis
              dataKey="attack_category"
              type="category"
              stroke="#71717a"
              fontSize={11}
              width={130}
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
              formatter={(value: number, name: string) => [
                `${value.toFixed(1)} days`,
                name,
              ]}
            />
            <Legend
              wrapperStyle={{ fontSize: 12, color: "#a1a1aa" }}
            />
            <Bar
              dataKey="avg_recovery_days"
              name="Recovery Days"
              fill="#06b6d4"
              radius={[0, 4, 4, 0]}
              barSize={14}
            />
            <Bar
              dataKey="avg_downtime_days"
              name="Downtime Days"
              fill="#f97316"
              radius={[0, 4, 4, 0]}
              barSize={14}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
