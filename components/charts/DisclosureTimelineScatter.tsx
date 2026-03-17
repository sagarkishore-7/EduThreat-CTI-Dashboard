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
  Legend,
  ZAxis,
} from "recharts";
import { EmptyState } from "@/components/EmptyState";

interface DisclosureDataPoint {
  incident_date: string;
  disclosure_delay_days: number;
  country: string;
  transparency_level: string | null;
}

interface DisclosureTimelineScatterProps {
  data: DisclosureDataPoint[];
}

const COUNTRY_COLORS: Record<string, string> = {
  US: "#06b6d4",
  Germany: "#8b5cf6",
  UK: "#f97316",
  Canada: "#ef4444",
  Australia: "#22c55e",
};

const OTHER_COLOR = "#6b7280";

function formatLabel(label: string): string {
  return label
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: DisclosureDataPoint & { dateTs: number } }>;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0].payload;
  return (
    <div
      style={{
        backgroundColor: "#111118",
        border: "1px solid #27272a",
        borderRadius: "8px",
        padding: "10px 14px",
      }}
    >
      <p className="text-xs text-cyan-400 font-medium mb-1">
        {point.incident_date}
      </p>
      <p className="text-xs text-zinc-300">
        Delay: <span className="font-semibold text-white">{point.disclosure_delay_days} days</span>
      </p>
      <p className="text-xs text-zinc-300">
        Country: <span className="font-semibold text-white">{formatLabel(point.country)}</span>
      </p>
      {point.transparency_level && (
        <p className="text-xs text-zinc-300">
          Transparency: <span className="font-semibold text-white">{formatLabel(point.transparency_level)}</span>
        </p>
      )}
    </div>
  );
}

export function DisclosureTimelineScatter({ data }: DisclosureTimelineScatterProps) {
  const { groupedData, topCountries } = useMemo(() => {
    if (!data || data.length === 0) {
      return { groupedData: new Map<string, (DisclosureDataPoint & { dateTs: number })[]>(), topCountries: [] };
    }

    // Count by country to find top 5
    const countryFreq = new Map<string, number>();
    for (const point of data) {
      countryFreq.set(point.country, (countryFreq.get(point.country) ?? 0) + 1);
    }

    const sorted = Array.from(countryFreq.entries())
      .sort((a, b) => b[1] - a[1]);
    const top5 = new Set(sorted.slice(0, 5).map(([c]) => c));

    // Group data by display country
    const grouped = new Map<string, (DisclosureDataPoint & { dateTs: number })[]>();

    for (const point of data) {
      const group = top5.has(point.country) ? point.country : "Other";
      if (!grouped.has(group)) {
        grouped.set(group, []);
      }
      grouped.get(group)!.push({
        ...point,
        dateTs: new Date(point.incident_date).getTime(),
      });
    }

    const topList = sorted.slice(0, 5).map(([c]) => c);
    if (grouped.has("Other")) {
      topList.push("Other");
    }

    return { groupedData: grouped, topCountries: topList };
  }, [data]);

  if (!data || data.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="text-lg font-semibold mb-4">Disclosure Timeline by Country</h3>
        <EmptyState message="No disclosure timeline data available" />
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <h3 className="text-lg font-semibold mb-4">Disclosure Timeline by Country</h3>
      <div className="h-[350px]">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
            <XAxis
              dataKey="dateTs"
              type="number"
              stroke="#71717a"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              domain={["dataMin", "dataMax"]}
              tickFormatter={(ts: number) => {
                const d = new Date(ts);
                return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
              }}
              name="Date"
            />
            <YAxis
              dataKey="disclosure_delay_days"
              type="number"
              stroke="#71717a"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              label={{
                value: "Days to Disclose",
                angle: -90,
                position: "insideLeft",
                style: { fill: "#71717a", fontSize: 12 },
              }}
              name="Delay"
            />
            <ZAxis range={[40, 40]} />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: 12, color: "#a1a1aa" }}
              formatter={(value: string) => formatLabel(value)}
            />
            {topCountries.map((country) => (
              <Scatter
                key={country}
                name={country}
                data={groupedData.get(country) ?? []}
                fill={COUNTRY_COLORS[country] ?? OTHER_COLOR}
                fillOpacity={0.75}
              />
            ))}
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
