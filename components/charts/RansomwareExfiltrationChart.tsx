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

interface ExfiltrationEntry {
  family: string;
  incident_count: number;
  exfiltration_count: number;
  exfiltration_rate: number;
}

interface RansomwareExfiltrationChartProps {
  data: ExfiltrationEntry[];
}

export function RansomwareExfiltrationChart({ data }: RansomwareExfiltrationChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="text-lg font-semibold mb-4">Ransomware Families &amp; Data Exfiltration</h3>
        <EmptyState message="No exfiltration data available" />
      </div>
    );
  }

  const chartData = data.map((d) => ({
    name: d.family.replace(/_/g, " "),
    Incidents: d.incident_count,
    Exfiltration: d.exfiltration_count,
    rate: d.exfiltration_rate,
  }));

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <h3 className="text-lg font-semibold mb-4">Ransomware Families &amp; Data Exfiltration</h3>
      <div className="h-[350px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
            <XAxis
              dataKey="name"
              stroke="#71717a"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              angle={-35}
              textAnchor="end"
              height={70}
              style={{ textTransform: "capitalize" }}
            />
            <YAxis
              stroke="#71717a"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{ backgroundColor: "#111118", border: "1px solid #27272a", borderRadius: "8px" }}
              labelStyle={{ color: "#06b6d4" }}
              itemStyle={{ color: "#e4e4e7" }}
              formatter={(value: number, name: string, props: unknown) => {
                const payload = (props as { payload?: { rate?: number } })?.payload;
                if (name === "Exfiltration" && payload?.rate !== undefined) {
                  return [`${value} (${payload.rate.toFixed(1)}%)`, name];
                }
                return [value, name];
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
            />
            <Bar
              dataKey="Incidents"
              fill="#ef4444"
              radius={[4, 4, 0, 0]}
              maxBarSize={40}
            />
            <Bar
              dataKey="Exfiltration"
              fill="#8b5cf6"
              radius={[4, 4, 0, 0]}
              maxBarSize={40}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
