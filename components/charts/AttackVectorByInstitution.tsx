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
  Legend,
} from "recharts";
import { EmptyState } from "@/components/EmptyState";

interface AttackVectorByInstitutionProps {
  data: {
    institution_types: string[];
    vectors: string[];
    data: { institution_type: string; attack_vector: string; count: number }[];
  };
}

const VECTOR_COLORS = [
  "#06b6d4",
  "#8b5cf6",
  "#f97316",
  "#22c55e",
  "#ef4444",
  "#eab308",
  "#ec4899",
  "#14b8a6",
  "#6366f1",
  "#f43f5e",
];

function formatLabel(label: string): string {
  return label
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function AttackVectorByInstitution({
  data,
}: AttackVectorByInstitutionProps) {
  const { chartData, vectors } = useMemo(() => {
    if (
      !data ||
      !data.data ||
      data.data.length === 0 ||
      !data.institution_types ||
      data.institution_types.length === 0
    )
      return { chartData: [], vectors: [] };

    const pivoted = data.institution_types.map((instType) => {
      const row: Record<string, string | number> = {
        institution_type: formatLabel(instType),
      };
      for (const vector of data.vectors) {
        const match = data.data.find(
          (d) =>
            d.institution_type === instType && d.attack_vector === vector
        );
        row[vector] = match ? match.count : 0;
      }
      return row;
    });

    return { chartData: pivoted, vectors: data.vectors };
  }, [data]);

  if (!data || !data.data || data.data.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="text-lg font-semibold mb-4">
          Attack Vectors by Institution Type
        </h3>
        <EmptyState message="No attack vector data available" />
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <h3 className="text-lg font-semibold mb-4">
        Attack Vectors by Institution Type
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
            />
            <YAxis
              dataKey="institution_type"
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
                value,
                formatLabel(name),
              ]}
            />
            <Legend
              wrapperStyle={{ fontSize: 11, color: "#a1a1aa" }}
              formatter={(value: string) => formatLabel(value)}
            />
            {vectors.map((vector, i) => (
              <Bar
                key={vector}
                dataKey={vector}
                name={vector}
                stackId="stack"
                fill={VECTOR_COLORS[i % VECTOR_COLORS.length]}
                barSize={20}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
