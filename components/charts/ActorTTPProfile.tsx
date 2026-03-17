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

interface ActorTTPProfileProps {
  data: {
    actors: string[];
    tactics: string[];
    data: { actor: string; tactic: string; count: number }[];
  };
}

const TACTIC_COLORS: Record<string, string> = {
  "Initial Access": "#ef4444",
  Execution: "#f97316",
  Persistence: "#f59e0b",
  "Privilege Escalation": "#eab308",
  "Defense Evasion": "#84cc16",
  "Credential Access": "#22c55e",
  Discovery: "#14b8a6",
  "Lateral Movement": "#06b6d4",
  Collection: "#3b82f6",
  "Command and Control": "#6366f1",
  Exfiltration: "#8b5cf6",
  Impact: "#a855f7",
  Reconnaissance: "#d946ef",
  "Resource Development": "#ec4899",
};

const FALLBACK_COLORS = [
  "#ef4444", "#f97316", "#f59e0b", "#eab308", "#84cc16", "#22c55e",
  "#14b8a6", "#06b6d4", "#3b82f6", "#6366f1", "#8b5cf6", "#a855f7",
  "#d946ef", "#ec4899",
];

function formatLabel(label: string): string {
  return label
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function getTacticColor(tactic: string, index: number): string {
  const formatted = formatLabel(tactic);
  return TACTIC_COLORS[formatted] ?? FALLBACK_COLORS[index % FALLBACK_COLORS.length];
}

export function ActorTTPProfile({ data }: ActorTTPProfileProps) {
  const { chartData, tactics } = useMemo(() => {
    if (!data || !data.data || data.data.length === 0) {
      return { chartData: [], tactics: [] };
    }

    const tacticList = data.tactics ?? [];
    const actorMap = new Map<string, Record<string, number>>();

    for (const point of data.data) {
      if (!actorMap.has(point.actor)) {
        actorMap.set(point.actor, {});
      }
      const row = actorMap.get(point.actor)!;
      row[point.tactic] = (row[point.tactic] ?? 0) + point.count;
    }

    const actors = data.actors ?? Array.from(actorMap.keys());
    const pivoted = actors.map((actor) => {
      const row: Record<string, string | number> = { actor: formatLabel(actor) };
      const values = actorMap.get(actor) ?? {};
      for (const tactic of tacticList) {
        row[tactic] = values[tactic] ?? 0;
      }
      return row;
    });

    return { chartData: pivoted, tactics: tacticList };
  }, [data]);

  if (!data || !data.data || data.data.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="text-lg font-semibold mb-4">Threat Actor TTP Profiles</h3>
        <EmptyState message="No actor TTP data available" />
      </div>
    );
  }

  const chartHeight = Math.max(350, chartData.length * 50);

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <h3 className="text-lg font-semibold mb-4">Threat Actor TTP Profiles</h3>
      <div style={{ height: `${chartHeight}px` }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 10, right: 30, left: 20, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={false} />
            <XAxis
              type="number"
              stroke="#71717a"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <YAxis
              type="category"
              dataKey="actor"
              stroke="#71717a"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              width={140}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#111118",
                border: "1px solid #27272a",
                borderRadius: "8px",
              }}
              labelStyle={{ color: "#06b6d4" }}
              itemStyle={{ color: "#e4e4e7" }}
              formatter={(value: number, name: string) => [value, formatLabel(name)]}
            />
            <Legend
              wrapperStyle={{ fontSize: 11, color: "#a1a1aa" }}
              formatter={(value: string) => formatLabel(value)}
            />
            {tactics.map((tactic, i) => (
              <Bar
                key={tactic}
                dataKey={tactic}
                fill={getTacticColor(tactic, i)}
                fillOpacity={0.85}
                name={tactic}
                radius={[0, 2, 2, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
