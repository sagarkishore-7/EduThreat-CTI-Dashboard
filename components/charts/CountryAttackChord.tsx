"use client";

import { ResponsiveChord } from "@nivo/chord";
import { nivoTheme, NIVO_COLORS } from "./nivo-theme";
import { EmptyState } from "@/components/EmptyState";
import type { CountryAttackMatrixResponse } from "@/lib/api";

interface CountryAttackChordProps {
  data: CountryAttackMatrixResponse | undefined;
}

export function CountryAttackChord({ data }: CountryAttackChordProps) {
  if (!data || !data.keys?.length || !data.matrix?.length) {
    return (
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="text-lg font-semibold mb-4">
          Country–Attack Relationships
        </h3>
        <EmptyState message="No country-attack relationship data available" />
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <h3 className="text-lg font-semibold mb-1">
        Country–Attack Relationships
      </h3>
      <p className="text-xs text-muted-foreground mb-4">
        Chord diagram showing which countries face which attack types. Hover
        arcs to see all connected attack categories.
      </p>
      <div className="h-[450px]">
        <ResponsiveChord
          data={data.matrix}
          keys={data.keys}
          theme={nivoTheme}
          colors={NIVO_COLORS}
          margin={{ top: 40, right: 40, bottom: 40, left: 40 }}
          padAngle={0.04}
          innerRadiusRatio={0.96}
          innerRadiusOffset={0.02}
          arcOpacity={1}
          arcBorderWidth={1}
          arcBorderColor={{ from: "color", modifiers: [["darker", 0.6]] }}
          ribbonOpacity={0.3}
          ribbonBorderWidth={0}
          ribbonBlendMode="normal"
          enableLabel={true}
          label="id"
          labelOffset={10}
          labelRotation={-90}
          labelTextColor={{ from: "color", modifiers: [["brighter", 1.5]] }}
          isInteractive={true}
          activeArcOpacity={1}
          inactiveArcOpacity={0.15}
          activeRibbonOpacity={0.75}
          inactiveRibbonOpacity={0.1}
          animate={true}
          motionConfig="gentle"
        />
      </div>
    </div>
  );
}
