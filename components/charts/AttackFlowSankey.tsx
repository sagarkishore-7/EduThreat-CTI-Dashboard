"use client";

import { ResponsiveSankey } from "@nivo/sankey";
import { nivoTheme, NIVO_COLORS } from "./nivo-theme";
import { EmptyState } from "@/components/EmptyState";
import type { AttackFlowResponse } from "@/lib/api";

interface AttackFlowSankeyProps {
  data: AttackFlowResponse | undefined;
}

export function AttackFlowSankey({ data }: AttackFlowSankeyProps) {
  if (!data || !data.nodes?.length || !data.links?.length) {
    return (
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="text-lg font-semibold mb-4">Attack Flow</h3>
        <EmptyState message="No attack flow data available" />
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <h3 className="text-lg font-semibold mb-1">Attack Flow</h3>
      <p className="text-xs text-muted-foreground mb-4">
        How attack vectors flow into categories and impact outcomes. Hover to
        trace paths.
      </p>
      <div className="h-[500px]">
        <ResponsiveSankey
          data={data}
          theme={nivoTheme}
          colors={NIVO_COLORS}
          margin={{ top: 20, right: 160, bottom: 20, left: 160 }}
          align="justify"
          sort="auto"
          nodeOpacity={1}
          nodeHoverOpacity={1}
          nodeHoverOthersOpacity={0.2}
          nodeThickness={16}
          nodeSpacing={18}
          nodeBorderWidth={1}
          nodeBorderColor={{ from: "color", modifiers: [["darker", 0.6]] }}
          nodeBorderRadius={3}
          linkOpacity={0.4}
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
