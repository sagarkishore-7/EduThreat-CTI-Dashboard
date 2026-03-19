"use client";

import { useMemo } from "react";
import { ResponsiveChord } from "@nivo/chord";
import { nivoTheme, NIVO_COLORS } from "./nivo-theme";
import { EmptyState } from "@/components/EmptyState";

interface ActorRansomwareMatrixData {
  actors: string[];
  families: string[];
  matrix: { actor: string; family: string; count: number }[];
}

interface ActorRansomwareChordProps {
  data: ActorRansomwareMatrixData | undefined;
}

export function ActorRansomwareChord({ data }: ActorRansomwareChordProps) {
  const chordData = useMemo(() => {
    if (!data || !data.actors?.length || !data.families?.length) return null;

    const keys = [...data.actors, ...data.families];
    const n = keys.length;
    const matrix: number[][] = Array.from({ length: n }, () =>
      Array(n).fill(0)
    );

    const keyIndex = new Map(keys.map((k, i) => [k, i]));

    for (const entry of data.matrix) {
      const ai = keyIndex.get(entry.actor);
      const fi = keyIndex.get(entry.family);
      if (ai !== undefined && fi !== undefined) {
        matrix[ai][fi] = entry.count;
        matrix[fi][ai] = entry.count;
      }
    }

    return { keys, matrix };
  }, [data]);

  if (!chordData) {
    return (
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="text-lg font-semibold mb-4">
          Actor–Ransomware Relationships
        </h3>
        <EmptyState message="No actor-ransomware relationship data available" />
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <h3 className="text-lg font-semibold mb-1">
        Actor–Ransomware Relationships
      </h3>
      <p className="text-xs text-muted-foreground mb-4">
        Chord diagram showing connections between threat actors and ransomware
        families. Hover to highlight relationships.
      </p>
      <div className="h-[500px]">
        <ResponsiveChord
          data={chordData.matrix}
          keys={chordData.keys}
          theme={nivoTheme}
          colors={NIVO_COLORS}
          margin={{ top: 40, right: 40, bottom: 40, left: 40 }}
          padAngle={0.04}
          innerRadiusRatio={0.96}
          innerRadiusOffset={0.02}
          arcOpacity={1}
          arcBorderWidth={1}
          arcBorderColor={{ from: "color", modifiers: [["darker", 0.6]] }}
          ribbonOpacity={0.35}
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
