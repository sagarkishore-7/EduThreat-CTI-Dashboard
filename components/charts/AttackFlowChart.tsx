"use client";

import { ResponsiveSankey } from "@nivo/sankey";
import type { AttackFlowResponse } from "@/lib/api";

interface AttackFlowChartProps {
  data: AttackFlowResponse;
}

const theme = {
  background: "transparent",
  text: { fontSize: 11, fill: "#a1a1aa" },
  tooltip: {
    container: {
      background: "#0f0f1a",
      border: "1px solid #1e1e3a",
      borderRadius: "6px",
      color: "#e4e4e7",
      fontSize: "12px",
    },
  },
};

export function AttackFlowChart({ data }: AttackFlowChartProps) {
  if (!data?.nodes?.length || !data?.links?.length) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        No attack flow data
      </div>
    );
  }

  return (
    <ResponsiveSankey
      data={data}
      margin={{ top: 8, right: 100, bottom: 8, left: 100 }}
      align="justify"
      colors={{ scheme: "set2" }}
      label={(node) => String(node.id).replace(/^(vec|cat|out):/, "")}
      nodeOpacity={1}
      nodeHoverOthersOpacity={0.35}
      nodeThickness={14}
      nodeSpacing={12}
      nodeBorderWidth={0}
      nodeBorderColor={{ from: "color", modifiers: [["darker", 0.8]] }}
      nodeBorderRadius={3}
      linkOpacity={0.3}
      linkHoverOthersOpacity={0.1}
      linkContract={2}
      enableLinkGradient
      labelPosition="outside"
      labelOrientation="horizontal"
      labelPadding={8}
      labelTextColor={{ from: "color", modifiers: [["brighter", 1]] }}
      theme={theme}
    />
  );
}
