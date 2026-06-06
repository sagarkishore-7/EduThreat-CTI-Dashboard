"use client";

import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { TimeSeriesPoint } from "@/lib/api";

function fmtMonth(label: string): string {
  const [y, m] = label.split("-");
  if (!y || !m) return label;
  const d = new Date(parseInt(y), parseInt(m) - 1);
  return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

function TooltipBox({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded border border-zinc-700 bg-[#0f1420] px-3 py-2 font-mono text-xs">
      <div className="mb-1 text-emerald-400">{fmtMonth(label ?? "")}</div>
      <div className="text-zinc-200">
        <span className="mr-1 text-zinc-500">incidents</span>
        <span className="font-bold">{payload[0].value}</span>
      </div>
    </div>
  );
}

/**
 * Brand-styled incident trend chart (area + line) with a spike marker on the
 * peak month. Matches the dashboard "Incidents over time" panel.
 */
export function TrendChart({ data, height = 188 }: { data: TimeSeriesPoint[]; height?: number }) {
  if (!data || data.length === 0) {
    return <div className="grid h-[188px] place-items-center text-sm text-zinc-600">No timeline data available.</div>;
  }
  const peak = data.reduce((m, d) => (d.count > m.count ? d : m), data[0]);

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 12, right: 8, left: -16, bottom: 0 }}>
          <defs>
            <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00d8b4" stopOpacity={0.32} />
              <stop offset="100%" stopColor="#00d8b4" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="2 4" stroke="#1f2434" vertical={false} />
          <XAxis
            dataKey="date"
            stroke="#585f78"
            fontSize={9.5}
            tickLine={false}
            axisLine={{ stroke: "#1f2434" }}
            tickFormatter={fmtMonth}
            interval="preserveStartEnd"
            minTickGap={28}
          />
          <YAxis stroke="#585f78" fontSize={9.5} tickLine={false} axisLine={false} width={30} />
          <Tooltip content={<TooltipBox />} cursor={{ stroke: "#2a3046" }} />
          {peak.date && <ReferenceLine x={peak.date} stroke="#ff4757" strokeDasharray="3 3" strokeOpacity={0.5} />}
          <Area
            type="monotone"
            dataKey="count"
            stroke="#00d8b4"
            strokeWidth={1.6}
            fill="url(#trendGrad)"
            dot={false}
            activeDot={{ r: 3.5, fill: "#00d8b4", stroke: "#08090f", strokeWidth: 1.5 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
