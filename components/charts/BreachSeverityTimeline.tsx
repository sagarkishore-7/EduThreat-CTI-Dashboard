"use client";

import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { EmptyState } from "@/components/EmptyState";

interface BreachSeverityTimelineData {
  month: string;
  incident_count: number;
  avg_records: number | null;
  breach_count: number;
}

interface BreachSeverityTimelineProps {
  data: BreachSeverityTimelineData[];
}

function formatAbbreviated(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return String(value);
}

export function BreachSeverityTimeline({ data }: BreachSeverityTimelineProps) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="text-lg font-semibold mb-4">
          Breach Severity Over Time
        </h3>
        <EmptyState message="No breach severity data available" />
      </div>
    );
  }

  const chartData = data.map((d) => ({
    ...d,
    avg_records: d.avg_records ?? 0,
  }));

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <h3 className="text-lg font-semibold mb-4">
        Breach Severity Over Time
      </h3>
      <div className="h-[350px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
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
              yAxisId="left"
              stroke="#71717a"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
              label={{
                value: "Incidents",
                angle: -90,
                position: "insideLeft",
                style: { fill: "#71717a", fontSize: 11 },
              }}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              stroke="#71717a"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => formatAbbreviated(v)}
              label={{
                value: "Avg Records",
                angle: 90,
                position: "insideRight",
                style: { fill: "#71717a", fontSize: 11 },
              }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#111118",
                border: "1px solid #27272a",
                borderRadius: "8px",
              }}
              labelStyle={{ color: "#06b6d4" }}
              itemStyle={{ color: "#e4e4e7" }}
              formatter={(value: number, name: string) => {
                if (name === "Avg Records Breached")
                  return [formatAbbreviated(value), name];
                return [value, name];
              }}
            />
            <Legend wrapperStyle={{ fontSize: 12, color: "#a1a1aa" }} />
            <Area
              yAxisId="left"
              type="monotone"
              dataKey="incident_count"
              name="Incident Count"
              stroke="#06b6d4"
              fill="#06b6d4"
              fillOpacity={0.3}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="avg_records"
              name="Avg Records Breached"
              stroke="#8b5cf6"
              strokeWidth={2}
              dot={{ fill: "#8b5cf6", r: 3 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
