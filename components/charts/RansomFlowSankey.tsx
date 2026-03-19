"use client";

import { useState, useMemo } from "react";
import { ResponsiveSankey } from "@nivo/sankey";
import { nivoTheme } from "./nivo-theme";
import { EmptyState } from "@/components/EmptyState";
import type { RansomFlowResponse } from "@/lib/api";

interface RansomFlowSankeyProps {
  data: RansomFlowResponse | undefined;
}

const NODE_COLORS: Record<string, string> = {
  Paid: "#ef4444",
  Refused: "#22c55e",
  "Unknown Outcome": "#64748b",
};

const FLOW_COLORS = [
  "#06b6d4",
  "#8b5cf6",
  "#f43f5e",
  "#22c55e",
  "#f59e0b",
  "#ec4899",
  "#3b82f6",
  "#14b8a6",
  "#a855f7",
  "#f97316",
  "#64748b",
];

export function RansomFlowSankey({ data }: RansomFlowSankeyProps) {
  const [metric, setMetric] = useState<"count" | "amount">("count");

  const sankeyData = useMemo(() => {
    if (!data || !data.nodes?.length) return null;
    return {
      nodes: data.nodes,
      links: metric === "count" ? data.links_by_count : data.links_by_amount,
    };
  }, [data, metric]);

  if (!sankeyData || !sankeyData.links?.length) {
    return (
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="text-lg font-semibold mb-4">Ransomware Payment Flow</h3>
        <EmptyState message="No ransomware payment flow data available" />
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-lg font-semibold">Ransomware Payment Flow</h3>
        <div className="flex gap-1 bg-muted rounded-lg p-0.5">
          <button
            onClick={() => setMetric("count")}
            className={`px-3 py-1 text-xs rounded-md transition-colors ${
              metric === "count"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            By Count
          </button>
          <button
            onClick={() => setMetric("amount")}
            className={`px-3 py-1 text-xs rounded-md transition-colors ${
              metric === "amount"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            By Amount ($)
          </button>
        </div>
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        Institution Type → Ransomware Family → Payment Outcome. Toggle metric
        above.
      </p>
      <div className="h-[480px]">
        <ResponsiveSankey
          data={sankeyData}
          theme={nivoTheme}
          colors={(node: any) => {
            if (NODE_COLORS[node.id]) return NODE_COLORS[node.id];
            const idx = sankeyData.nodes.findIndex(
              (n) => n.id === node.id
            );
            return FLOW_COLORS[idx % FLOW_COLORS.length];
          }}
          margin={{ top: 20, right: 180, bottom: 20, left: 180 }}
          align="justify"
          sort="auto"
          nodeOpacity={1}
          nodeHoverOpacity={1}
          nodeHoverOthersOpacity={0.2}
          nodeThickness={16}
          nodeSpacing={16}
          nodeBorderWidth={1}
          nodeBorderColor={{ from: "color", modifiers: [["darker", 0.6]] }}
          nodeBorderRadius={3}
          linkOpacity={0.35}
          linkHoverOpacity={0.7}
          linkHoverOthersOpacity={0.1}
          linkContract={2}
          linkBlendMode="normal"
          enableLinkGradient={true}
          labelPosition="outside"
          labelOrientation="horizontal"
          labelPadding={12}
          labelTextColor={{ from: "color", modifiers: [["brighter", 1.5]] }}
          animate={true}
          motionConfig="gentle"
        />
      </div>
    </div>
  );
}
