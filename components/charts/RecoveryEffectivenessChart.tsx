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

interface RecoveryEffectivenessData {
  total: number;
  backup_rate: number;
  ir_firm_rate: number;
  forensics_rate: number;
  mfa_adoption_rate: number;
  avg_recovery_days: number | null;
  avg_downtime_days: number | null;
}

interface RecoveryEffectivenessChartProps {
  data: RecoveryEffectivenessData;
}

const BAR_COLORS = ["#06b6d4", "#22c55e", "#0d9488", "#10b981", "#67e8f9"];

export function RecoveryEffectivenessChart({ data }: RecoveryEffectivenessChartProps) {
  if (!data || data.total === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="text-lg font-semibold mb-4">Recovery Effectiveness</h3>
        <EmptyState message="No recovery effectiveness data available" />
      </div>
    );
  }

  const barData = [
    { name: "Backup Restore", value: data.backup_rate, color: BAR_COLORS[0] },
    { name: "IR Firm Engaged", value: data.ir_firm_rate, color: BAR_COLORS[1] },
    { name: "Forensics Done", value: data.forensics_rate, color: BAR_COLORS[2] },
    { name: "MFA Adopted", value: data.mfa_adoption_rate, color: BAR_COLORS[3] },
  ];

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <h3 className="text-lg font-semibold mb-4">Recovery Effectiveness</h3>

      {/* Duration callouts */}
      <div className="flex gap-4 mb-5">
        <div className="flex-1 bg-zinc-900/50 border border-zinc-800 rounded-lg p-3 text-center">
          <p className="text-xs text-zinc-400 mb-1">Avg Recovery Time</p>
          <p className="text-2xl font-bold text-cyan-400">
            {data.avg_recovery_days !== null
              ? `${data.avg_recovery_days.toFixed(1)}d`
              : "N/A"}
          </p>
        </div>
        <div className="flex-1 bg-zinc-900/50 border border-zinc-800 rounded-lg p-3 text-center">
          <p className="text-xs text-zinc-400 mb-1">Avg Downtime</p>
          <p className="text-2xl font-bold text-orange-400">
            {data.avg_downtime_days !== null
              ? `${data.avg_downtime_days.toFixed(1)}d`
              : "N/A"}
          </p>
        </div>
      </div>

      {/* Horizontal bar chart for percentage metrics */}
      <div className="h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={barData}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={false} />
            <XAxis
              type="number"
              domain={[0, 100]}
              stroke="#71717a"
              fontSize={12}
              tickFormatter={(v: number) => `${v}%`}
            />
            <YAxis
              dataKey="name"
              type="category"
              stroke="#71717a"
              fontSize={11}
              width={110}
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
              formatter={(value: number) => [`${value.toFixed(1)}%`, "Rate"]}
            />
            <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={24}>
              {barData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <p className="text-xs text-zinc-500 mt-3 text-right">
        Based on {formatNumber(data.total)} incidents
      </p>
    </div>
  );
}
