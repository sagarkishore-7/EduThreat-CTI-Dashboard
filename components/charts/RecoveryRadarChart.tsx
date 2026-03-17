"use client";

import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";
import { EmptyState } from "@/components/EmptyState";

interface RecoveryComparison {
  avg_recovery_days: number;
  avg_downtime_days: number;
  backup_rate: number;
  ir_firm_rate: number;
  forensics_rate: number;
  total: number;
}

interface RecoveryRadarChartProps {
  data: {
    ransomware: RecoveryComparison;
    other: RecoveryComparison;
  };
}

export function RecoveryRadarChart({ data }: RecoveryRadarChartProps) {
  if (
    !data ||
    (data.ransomware.total === 0 && data.other.total === 0)
  ) {
    return (
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="text-lg font-semibold mb-4">Recovery: Ransomware vs Other Attacks</h3>
        <EmptyState message="No recovery comparison data available" />
      </div>
    );
  }

  // Normalize values to 0-100 scale for the radar chart
  const maxRecovery = Math.max(data.ransomware.avg_recovery_days, data.other.avg_recovery_days) || 1;
  const maxDowntime = Math.max(data.ransomware.avg_downtime_days, data.other.avg_downtime_days) || 1;

  const chartData = [
    {
      metric: "Recovery Days",
      ransomware: (data.ransomware.avg_recovery_days / maxRecovery) * 100,
      other: (data.other.avg_recovery_days / maxRecovery) * 100,
      rawRansomware: data.ransomware.avg_recovery_days,
      rawOther: data.other.avg_recovery_days,
      unit: "days",
    },
    {
      metric: "Downtime Days",
      ransomware: (data.ransomware.avg_downtime_days / maxDowntime) * 100,
      other: (data.other.avg_downtime_days / maxDowntime) * 100,
      rawRansomware: data.ransomware.avg_downtime_days,
      rawOther: data.other.avg_downtime_days,
      unit: "days",
    },
    {
      metric: "Backup %",
      ransomware: data.ransomware.backup_rate,
      other: data.other.backup_rate,
      rawRansomware: data.ransomware.backup_rate,
      rawOther: data.other.backup_rate,
      unit: "%",
    },
    {
      metric: "IR Firm %",
      ransomware: data.ransomware.ir_firm_rate,
      other: data.other.ir_firm_rate,
      rawRansomware: data.ransomware.ir_firm_rate,
      rawOther: data.other.ir_firm_rate,
      unit: "%",
    },
    {
      metric: "Forensics %",
      ransomware: data.ransomware.forensics_rate,
      other: data.other.forensics_rate,
      rawRansomware: data.ransomware.forensics_rate,
      rawOther: data.other.forensics_rate,
      unit: "%",
    },
  ];

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <h3 className="text-lg font-semibold mb-4">Recovery: Ransomware vs Other Attacks</h3>
      <div className="h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="70%" data={chartData}>
            <PolarGrid stroke="#27272a" />
            <PolarAngleAxis
              dataKey="metric"
              tick={{ fill: "#a1a1aa", fontSize: 12 }}
            />
            <PolarRadiusAxis
              angle={90}
              domain={[0, 100]}
              tick={{ fill: "#52525b", fontSize: 10 }}
              tickCount={5}
            />
            <Tooltip
              contentStyle={{ backgroundColor: "#111118", border: "1px solid #27272a", borderRadius: "8px" }}
              labelStyle={{ color: "#06b6d4" }}
              itemStyle={{ color: "#e4e4e7" }}
              formatter={(_value: number, name: string, props: unknown) => {
                const payload = (props as { payload?: { rawRansomware?: number; rawOther?: number; unit?: string } })?.payload;
                const raw = name === "Ransomware"
                  ? payload?.rawRansomware
                  : payload?.rawOther;
                const unit = payload?.unit ?? "";
                if (unit === "days") {
                  return [`${raw?.toFixed(1)} ${unit}`, name];
                }
                return [`${raw?.toFixed(1)}${unit}`, name];
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
            />
            <Radar
              name="Ransomware"
              dataKey="ransomware"
              stroke="#ef4444"
              fill="#ef4444"
              fillOpacity={0.2}
              strokeWidth={2}
            />
            <Radar
              name="Other"
              dataKey="other"
              stroke="#06b6d4"
              fill="#06b6d4"
              fillOpacity={0.2}
              strokeWidth={2}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex justify-center gap-6 mt-2 text-xs text-muted-foreground">
        <span>Ransomware: {data.ransomware.total} incidents</span>
        <span>Other: {data.other.total} incidents</span>
      </div>
    </div>
  );
}
