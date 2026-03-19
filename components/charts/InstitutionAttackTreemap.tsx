"use client";

import { useMemo } from "react";
import { ResponsiveTreeMapHtml } from "@nivo/treemap";
import { nivoTheme, NIVO_COLORS } from "./nivo-theme";
import { EmptyState } from "@/components/EmptyState";

interface InstitutionRiskItem {
  institution_type: string;
  attack_category: string;
  count: number;
}

interface TreemapDatum {
  id: string;
  value?: number;
  children?: TreemapDatum[];
}

interface InstitutionAttackTreemapProps {
  data: InstitutionRiskItem[];
}

function formatLabel(s: string): string {
  return s
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function InstitutionAttackTreemap({ data }: InstitutionAttackTreemapProps) {
  const treeData = useMemo<TreemapDatum>(() => {
    if (!data || data.length === 0) return { id: "root", children: [] };

    const byInstitution = new Map<string, TreemapDatum>();

    for (const item of data) {
      const instKey = item.institution_type;
      if (!byInstitution.has(instKey)) {
        byInstitution.set(instKey, {
          id: formatLabel(instKey),
          children: [],
        });
      }
      byInstitution.get(instKey)!.children!.push({
        id: formatLabel(item.attack_category),
        value: item.count,
      });
    }

    return {
      id: "Education Sector",
      children: Array.from(byInstitution.values()).sort(
        (a, b) =>
          (b.children?.reduce((s, c) => s + (c.value ?? 0), 0) ?? 0) -
          (a.children?.reduce((s, c) => s + (c.value ?? 0), 0) ?? 0)
      ),
    };
  }, [data]);

  if (!data || data.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="text-lg font-semibold mb-4">Institution Attack Treemap</h3>
        <EmptyState message="No institution risk data available" />
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <h3 className="text-lg font-semibold mb-1">Institution Attack Treemap</h3>
      <p className="text-xs text-muted-foreground mb-4">
        Click to drill down into institution types. Size = incident count.
      </p>
      <div className="h-[480px]">
        <ResponsiveTreeMapHtml<TreemapDatum>
          data={treeData}
          identity="id"
          value="value"
          tile="squarify"
          leavesOnly={false}
          innerPadding={2}
          outerPadding={4}
          theme={nivoTheme}
          colors={NIVO_COLORS}
          colorBy="id"
          nodeOpacity={0.85}
          borderWidth={1}
          borderColor={{ from: "color", modifiers: [["darker", 0.6]] }}
          enableLabel={true}
          labelSkipSize={40}
          labelTextColor={{ from: "color", modifiers: [["brighter", 2.5]] }}
          enableParentLabel={true}
          parentLabelSize={22}
          parentLabelPosition="top"
          parentLabelPadding={6}
          parentLabelTextColor={{ from: "color", modifiers: [["brighter", 3]] }}
          animate={true}
          motionConfig="gentle"
        />
      </div>
    </div>
  );
}
