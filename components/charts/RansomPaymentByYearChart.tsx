"use client";

import { useMemo } from "react";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { EmptyState } from "@/components/EmptyState";

interface RansomPaymentByYearData {
  year: string | null;
  total_incidents: number;
  demanded_count: number;
  paid_count: number;
  total_demanded: number | null;
  total_paid: number | null;
  payment_rate: number;
}

interface RansomPaymentByYearChartProps {
  data: RansomPaymentByYearData[];
}

function formatDollar(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value}`;
}

export function RansomPaymentByYearChart({
  data,
}: RansomPaymentByYearChartProps) {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];
    return data
      .filter(
        (d) =>
          d.year !== null && d.total_demanded !== null && d.total_demanded !== 0
      )
      .map((d) => ({
        year: d.year!,
        total_demanded: d.total_demanded!,
        total_paid: d.total_paid ?? 0,
        payment_rate: d.payment_rate,
        total_incidents: d.total_incidents,
        demanded_count: d.demanded_count,
        paid_count: d.paid_count,
      }));
  }, [data]);

  if (!data || data.length === 0 || chartData.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="text-lg font-semibold mb-4">
          Ransom Payments Over Time
        </h3>
        <EmptyState message="No ransom payment data available" />
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <h3 className="text-lg font-semibold mb-4">
        Ransom Payments Over Time
      </h3>
      <div className="h-[350px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
            margin={{ top: 10, right: 30, left: 10, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
            <XAxis
              dataKey="year"
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
              tickFormatter={(v: number) => formatDollar(v)}
              label={{
                value: "Amount",
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
              domain={[0, 100]}
              tickFormatter={(v: number) => `${v}%`}
              label={{
                value: "Payment Rate",
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
                if (name === "Payment Rate") return [`${value.toFixed(1)}%`, name];
                return [formatDollar(value), name];
              }}
            />
            <Legend wrapperStyle={{ fontSize: 12, color: "#a1a1aa" }} />
            <Bar
              yAxisId="left"
              dataKey="total_demanded"
              name="Total Demanded"
              fill="#ef4444"
              radius={[4, 4, 0, 0]}
              barSize={20}
            />
            <Bar
              yAxisId="left"
              dataKey="total_paid"
              name="Total Paid"
              fill="#f97316"
              radius={[4, 4, 0, 0]}
              barSize={20}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="payment_rate"
              name="Payment Rate"
              stroke="#06b6d4"
              strokeWidth={2}
              dot={{ fill: "#06b6d4", r: 3 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
