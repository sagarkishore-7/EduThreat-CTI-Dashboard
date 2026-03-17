"use client";

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Text,
} from "recharts";
import { EmptyState } from "@/components/EmptyState";

interface DataBreachRow {
  institution_type: string;
  total_incidents: number;
  breach_count: number;
  breach_rate: number;
  avg_records: number | null;
  total_records: number | null;
}

interface DataBreachByInstitutionChartProps {
  data: DataBreachRow[];
}

function formatLabel(label: string): string {
  return label
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatRecords(value: number | null): string {
  if (value == null) return "N/A";
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toFixed(0);
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: DataBreachRow & { label: string } }>;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const row = payload[0].payload;
  return (
    <div
      style={{
        backgroundColor: "#111118",
        border: "1px solid #27272a",
        borderRadius: "8px",
        padding: "10px 14px",
      }}
    >
      <p className="text-xs text-cyan-400 font-medium mb-1">{row.label}</p>
      <p className="text-xs text-zinc-300">
        Breach Rate: <span className="font-semibold text-white">{row.breach_rate.toFixed(1)}%</span>
      </p>
      <p className="text-xs text-zinc-300">
        Breaches: <span className="font-semibold text-white">{row.breach_count} / {row.total_incidents}</span>
      </p>
      <p className="text-xs text-zinc-300">
        Avg Records: <span className="font-semibold text-orange-400">{formatRecords(row.avg_records)}</span>
      </p>
      {row.total_records != null && (
        <p className="text-xs text-zinc-300">
          Total Records: <span className="font-semibold text-white">{formatRecords(row.total_records)}</span>
        </p>
      )}
    </div>
  );
}

interface CustomBarLabelProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  value?: number;
  index?: number;
}

export function DataBreachByInstitutionChart({ data }: DataBreachByInstitutionChartProps) {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];
    return data
      .map((row) => ({
        ...row,
        label: formatLabel(row.institution_type),
        avg_records_display: formatRecords(row.avg_records),
      }))
      .sort((a, b) => b.breach_rate - a.breach_rate);
  }, [data]);

  if (!data || data.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="text-lg font-semibold mb-4">Data Breach Rate by Institution Type</h3>
        <EmptyState message="No data breach data available" />
      </div>
    );
  }

  const chartHeight = Math.max(350, chartData.length * 45);

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <h3 className="text-lg font-semibold mb-4">Data Breach Rate by Institution Type</h3>
      <div style={{ height: `${chartHeight}px` }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 10, right: 80, left: 20, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={false} />
            <XAxis
              type="number"
              stroke="#71717a"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => `${v}%`}
              domain={[0, "dataMax"]}
              label={{
                value: "Breach Rate %",
                position: "insideBottom",
                offset: -5,
                style: { fill: "#71717a", fontSize: 12 },
              }}
            />
            <YAxis
              type="category"
              dataKey="label"
              stroke="#71717a"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              width={140}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar
              dataKey="breach_rate"
              fill="#06b6d4"
              fillOpacity={0.85}
              radius={[0, 4, 4, 0]}
              name="Breach Rate"
              label={({ x, y, width, height, index }: CustomBarLabelProps) => {
                const row = chartData[index ?? 0];
                if (!row || row.avg_records == null) {
                  return <text />;
                }
                return (
                  <text
                    x={(x ?? 0) + (width ?? 0) + 8}
                    y={(y ?? 0) + (height ?? 0) / 2}
                    fill="#f97316"
                    fontSize={11}
                    fontWeight={600}
                    dominantBaseline="middle"
                  >
                    {row.avg_records_display}
                  </text>
                );
              }}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex items-center gap-4 mt-3 justify-end">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-cyan-500" />
          <span className="text-xs text-muted-foreground">Breach Rate %</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-orange-500" />
          <span className="text-xs text-muted-foreground">Avg Records Breached</span>
        </div>
      </div>
    </div>
  );
}
