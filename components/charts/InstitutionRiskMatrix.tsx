"use client";

import { useMemo } from "react";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ZAxis,
} from "recharts";
import { EmptyState } from "@/components/EmptyState";

interface InstitutionRiskMatrixData {
  institution_type: string;
  attack_category: string;
  count: number;
}

interface InstitutionRiskMatrixProps {
  data: InstitutionRiskMatrixData[];
}

function formatLabel(label: string): string {
  return label
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function InstitutionRiskMatrix({ data }: InstitutionRiskMatrixProps) {
  const { chartData, institutionTypes, attackCategories } = useMemo(() => {
    if (!data || data.length === 0)
      return { chartData: [], institutionTypes: [], attackCategories: [] };

    const types = Array.from(new Set(data.map((d) => d.institution_type)));
    const categories = Array.from(new Set(data.map((d) => d.attack_category)));

    const mapped = data.map((d) => ({
      x: types.indexOf(d.institution_type),
      y: categories.indexOf(d.attack_category),
      count: d.count,
      institution_type: d.institution_type,
      attack_category: d.attack_category,
    }));

    return {
      chartData: mapped,
      institutionTypes: types,
      attackCategories: categories,
    };
  }, [data]);

  if (!data || data.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="text-lg font-semibold mb-4">
          Institution Type vs Attack Category
        </h3>
        <EmptyState message="No institution risk data available" />
      </div>
    );
  }

  const maxCount = Math.max(...data.map((d) => d.count));

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <h3 className="text-lg font-semibold mb-4">
        Institution Type vs Attack Category
      </h3>
      <div className="h-[350px]">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
            <XAxis
              type="number"
              dataKey="x"
              stroke="#71717a"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              domain={[-0.5, institutionTypes.length - 0.5]}
              ticks={institutionTypes.map((_, i) => i)}
              tickFormatter={(v: number) =>
                institutionTypes[v] ? formatLabel(institutionTypes[v]) : ""
              }
            />
            <YAxis
              type="number"
              dataKey="y"
              stroke="#71717a"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              domain={[-0.5, attackCategories.length - 0.5]}
              ticks={attackCategories.map((_, i) => i)}
              tickFormatter={(v: number) =>
                attackCategories[v] ? formatLabel(attackCategories[v]) : ""
              }
              width={120}
            />
            <ZAxis
              type="number"
              dataKey="count"
              range={[40, 400]}
              domain={[0, maxCount]}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#111118",
                border: "1px solid #27272a",
                borderRadius: "8px",
              }}
              labelStyle={{ color: "#06b6d4" }}
              itemStyle={{ color: "#e4e4e7" }}
              content={({ payload }) => {
                if (!payload || payload.length === 0) return null;
                const d = payload[0].payload;
                return (
                  <div
                    style={{
                      backgroundColor: "#111118",
                      border: "1px solid #27272a",
                      borderRadius: "8px",
                      padding: "8px 12px",
                    }}
                  >
                    <p style={{ color: "#06b6d4", fontSize: 12, margin: 0 }}>
                      {formatLabel(d.institution_type)}
                    </p>
                    <p style={{ color: "#e4e4e7", fontSize: 12, margin: 0 }}>
                      {formatLabel(d.attack_category)}
                    </p>
                    <p style={{ color: "#a1a1aa", fontSize: 12, margin: 0 }}>
                      Count: {d.count}
                    </p>
                  </div>
                );
              }}
            />
            <Scatter data={chartData} fill="#06b6d4" fillOpacity={0.7} />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
