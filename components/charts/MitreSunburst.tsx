"use client";

import { useState, useCallback } from "react";
import { ResponsiveSunburst } from "@nivo/sunburst";
import { nivoTheme, NIVO_COLORS } from "./nivo-theme";
import { EmptyState } from "@/components/EmptyState";
import type { MitreSunburstNode } from "@/lib/api";

interface MitreSunburstProps {
  data: MitreSunburstNode | undefined;
}

export function MitreSunburst({ data }: MitreSunburstProps) {
  const [drillPath, setDrillPath] = useState<MitreSunburstNode[]>([]);

  const currentData = drillPath.length > 0 ? drillPath[drillPath.length - 1] : data;

  const handleClick = useCallback(
    (node: { id: string; data: MitreSunburstNode }) => {
      if (node.data.children && node.data.children.length > 0) {
        setDrillPath((prev) => [...prev, node.data]);
      }
    },
    []
  );

  const handleBreadcrumb = useCallback((index: number) => {
    if (index < 0) {
      setDrillPath([]);
    } else {
      setDrillPath((prev) => prev.slice(0, index + 1));
    }
  }, []);

  if (!data || !data.children?.length) {
    return (
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="text-lg font-semibold mb-4">MITRE ATT&CK Sunburst</h3>
        <EmptyState message="No MITRE technique data available" />
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <h3 className="text-lg font-semibold mb-1">MITRE ATT&CK Sunburst</h3>
      <p className="text-xs text-muted-foreground mb-2">
        Hierarchical view: Tactic → Technique. Click a segment to drill down.
      </p>

      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-xs mb-3 flex-wrap">
        <button
          onClick={() => handleBreadcrumb(-1)}
          className={`px-2 py-0.5 rounded transition-colors ${
            drillPath.length === 0
              ? "bg-primary/20 text-primary"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
        >
          MITRE ATT&CK
        </button>
        {drillPath.map((node, i) => (
          <span key={node.id} className="flex items-center gap-1">
            <span className="text-muted-foreground">›</span>
            <button
              onClick={() => handleBreadcrumb(i)}
              className={`px-2 py-0.5 rounded transition-colors ${
                i === drillPath.length - 1
                  ? "bg-primary/20 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              {node.id}
            </button>
          </span>
        ))}
      </div>

      <div className="h-[520px]">
        {currentData && (
          <ResponsiveSunburst
            data={currentData}
            id="id"
            value="value"
            theme={nivoTheme}
            colors={NIVO_COLORS}
            margin={{ top: 10, right: 10, bottom: 10, left: 10 }}
            cornerRadius={3}
            borderWidth={1}
            borderColor={{ from: "color", modifiers: [["darker", 0.5]] }}
            childColor={{ from: "color", modifiers: [["brighter", 0.3]] }}
            enableArcLabels={true}
            arcLabelsSkipAngle={12}
            arcLabelsTextColor={{ from: "color", modifiers: [["brighter", 2]] }}
            animate={true}
            motionConfig="gentle"
            transitionMode="pushIn"
            onClick={handleClick as any}
          />
        )}
      </div>
    </div>
  );
}
