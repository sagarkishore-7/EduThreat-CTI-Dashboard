"use client";

import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { EmptyState } from "@/components/EmptyState";

interface OperationalImpactData {
  category: string;
  count: number;
  percentage: number;
}

interface OperationalImpactRadarProps {
  data: OperationalImpactData[];
}

const AXIS_LABELS: Record<string, string> = {
  teaching_disrupted: "Teaching Disrupted",
  research_disrupted: "Research Disrupted",
  admissions_disrupted: "Admissions Disrupted",
  enrollment_disrupted: "Enrollment Disrupted",
  payroll_disrupted: "Payroll Disrupted",
  classes_cancelled: "Classes Cancelled",
  exams_postponed: "Exams Postponed",
};

export function OperationalImpactRadar({ data }: OperationalImpactRadarProps) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="text-lg font-semibold mb-4">Operational Impact</h3>
        <EmptyState message="No operational impact data available" />
      </div>
    );
  }

  const chartData = data.map((item) => ({
    axis: AXIS_LABELS[item.category] ?? item.category,
    value: item.count,
    percentage: item.percentage,
  }));

  const maxValue = Math.max(...chartData.map((d) => d.value), 1);

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <h3 className="text-lg font-semibold mb-4">Operational Impact</h3>
      <div className="h-[350px]">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="70%" data={chartData}>
            <PolarGrid stroke="#27272a" />
            <PolarAngleAxis
              dataKey="axis"
              tick={{ fill: "#a1a1aa", fontSize: 11 }}
            />
            <PolarRadiusAxis
              angle={90}
              domain={[0, maxValue]}
              tick={{ fill: "#71717a", fontSize: 10 }}
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
              formatter={(value: number, _name: string, props: unknown) => {
                const payload = (props as { payload?: { percentage?: number } })?.payload;
                const percentage = payload?.percentage ?? 0;
                return [`${value} (${percentage}%)`, "Incidents"];
              }}
            />
            <Radar
              name="Impact"
              dataKey="value"
              stroke="#06b6d4"
              fill="#06b6d4"
              fillOpacity={0.25}
              strokeWidth={2}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
