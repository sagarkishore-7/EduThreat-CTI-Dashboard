"use client";

import { ResponsiveNetwork } from "@nivo/network";
import { nivoTheme, NIVO_COLORS } from "./nivo-theme";
import { EmptyState } from "@/components/EmptyState";
import type { ActorNetworkResponse } from "@/lib/api";

interface ActorNetworkGraphProps {
  data: ActorNetworkResponse | undefined;
}

export function ActorNetworkGraph({ data }: ActorNetworkGraphProps) {
  if (!data || !data.nodes?.length) {
    return (
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="text-lg font-semibold mb-4">
          Threat Actor Network
        </h3>
        <EmptyState message="No actor network data available" />
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <h3 className="text-lg font-semibold mb-1">Threat Actor Network</h3>
      <p className="text-xs text-muted-foreground mb-4">
        Force-directed graph showing actors connected by shared ransomware
        families. Node size = incident count. Hover for details.
      </p>
      <div className="h-[550px]">
        <ResponsiveNetwork
          data={data}
          theme={nivoTheme}
          margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
          linkDistance={(link: any) => link.distance || 80}
          centeringStrength={0.4}
          repulsivity={12}
          iterations={60}
          nodeSize={(node: any) => node.radius || 12}
          activeNodeSize={(node: any) => (node.radius || 12) * 1.4}
          inactiveNodeSize={(node: any) => (node.radius || 12) * 0.6}
          nodeColor={(node: any) => {
            const idx = data.nodes.findIndex((n) => n.id === node.id);
            return NIVO_COLORS[idx % NIVO_COLORS.length];
          }}
          nodeBorderWidth={2}
          nodeBorderColor={{ from: "color", modifiers: [["darker", 0.6]] }}
          linkThickness={2}
          linkColor={{ from: "source.color", modifiers: [["darker", 0.3]] }}
          linkBlendMode="normal"
          isInteractive={true}
          nodeTooltip={({ node }: any) => (
            <div
              style={{
                background: "#111118",
                border: "1px solid #27272a",
                borderRadius: 8,
                padding: "8px 12px",
                color: "#e4e4e7",
                fontSize: 12,
              }}
            >
              <strong>{node.id}</strong>
              <div className="mt-1 text-[11px] opacity-70">
                {node.data.count} incidents
              </div>
              {node.data.families?.length > 0 && (
                <div className="mt-1 text-[11px] opacity-70">
                  Families: {node.data.families.join(", ")}
                </div>
              )}
            </div>
          )}
          animate={true}
          motionConfig="gentle"
        />
      </div>
    </div>
  );
}
