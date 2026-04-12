"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import type { TimeSeriesPoint } from "@/lib/api";

interface IncidentTimeChartProps {
  data: TimeSeriesPoint[];
}

function CustomTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const [year, month] = (label ?? "").split("-");
  const date = new Date(parseInt(year ?? "0"), parseInt(month ?? "1") - 1);
  const formatted = date.toLocaleDateString("en-US", { year: "numeric", month: "long" });

  return (
    <div className="px-3 py-2 rounded border text-xs font-mono"
      style={{ background: "#0c0c18", borderColor: "#1e1e3a" }}>
      <div className="text-cyan-400 mb-1">{formatted}</div>
      <div className="text-zinc-200">
        <span className="text-zinc-500 mr-1">incidents</span>
        <span className="font-bold">{payload[0].value}</span>
      </div>
    </div>
  );
}

export function IncidentTimeChart({ data }: IncidentTimeChartProps) {
  // Find peak month for reference line
  const peak = data.reduce((max, d) => d.count > max.count ? d : max, data[0] ?? { date: "", count: 0 });

  return (
    <div className="bg-[#0c0c18] border border-zinc-800 rounded-lg p-4 h-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-medium mb-0.5">
            Incident Timeline
          </p>
          <h3 className="text-sm font-semibold text-zinc-200">Attacks Over Time</h3>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-zinc-600 font-mono">24-month window</p>
          {peak.date && (
            <p className="text-[10px] text-amber-500 font-mono">
              peak {peak.date}: {peak.count}
            </p>
          )}
        </div>
      </div>

      <div className="h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 4, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="timeGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#06b6d4" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="2 4"
              stroke="#1a1a2e"
              vertical={false}
            />
            <XAxis
              dataKey="date"
              stroke="#3f3f5a"
              fontSize={10}
              tickLine={false}
              axisLine={{ stroke: "#1a1a2e" }}
              fontFamily="monospace"
              tickFormatter={(v) => {
                const [y, m] = v.split("-");
                return `${m}/${y.slice(2)}`;
              }}
              interval="preserveStartEnd"
            />
            <YAxis
              stroke="#3f3f5a"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              fontFamily="monospace"
              width={28}
            />
            <Tooltip content={<CustomTooltip />} />
            {peak.date && (
              <ReferenceLine
                x={peak.date}
                stroke="#f59e0b"
                strokeDasharray="3 3"
                strokeOpacity={0.5}
              />
            )}
            <Area
              type="monotone"
              dataKey="count"
              stroke="#06b6d4"
              strokeWidth={1.5}
              fillOpacity={1}
              fill="url(#timeGradient)"
              dot={false}
              activeDot={{ r: 4, fill: "#06b6d4", stroke: "#0c0c18", strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
