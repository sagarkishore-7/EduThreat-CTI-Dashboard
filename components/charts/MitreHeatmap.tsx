"use client";

import { useState } from "react";
import { EmptyState } from "@/components/EmptyState";

interface MitreTacticData {
  tactic: string;
  count: number;
  techniques: string[];
}

interface MitreHeatmapProps {
  data: MitreTacticData[];
}

const ORDERED_TACTICS = [
  "Initial Access",
  "Execution",
  "Persistence",
  "Privilege Escalation",
  "Defense Evasion",
  "Credential Access",
  "Discovery",
  "Lateral Movement",
  "Collection",
  "Command and Control",
  "Exfiltration",
  "Impact",
  "Reconnaissance",
  "Resource Development",
];

function getIntensityClass(count: number, maxCount: number): string {
  if (maxCount === 0 || count === 0) return "bg-cyan-500/10";
  const ratio = count / maxCount;
  if (ratio <= 0.15) return "bg-cyan-500/15";
  if (ratio <= 0.3) return "bg-cyan-500/25";
  if (ratio <= 0.45) return "bg-cyan-500/35";
  if (ratio <= 0.6) return "bg-cyan-500/50";
  if (ratio <= 0.75) return "bg-cyan-500/65";
  if (ratio <= 0.9) return "bg-cyan-500/80";
  return "bg-cyan-500";
}

function getTextClass(count: number, maxCount: number): string {
  if (maxCount === 0 || count === 0) return "text-muted-foreground/60";
  const ratio = count / maxCount;
  return ratio > 0.5 ? "text-white" : "text-cyan-100";
}

export function MitreHeatmap({ data }: MitreHeatmapProps) {
  const [hoveredTactic, setHoveredTactic] = useState<string | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="text-lg font-semibold mb-4">
          MITRE ATT&CK Tactics Heatmap
        </h3>
        <EmptyState message="No MITRE ATT&CK data available" />
      </div>
    );
  }

  const tacticMap = new Map<string, MitreTacticData>();
  for (const item of data) {
    tacticMap.set(item.tactic, item);
  }

  const maxCount = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <h3 className="text-lg font-semibold mb-4">
        MITRE ATT&CK Tactics Heatmap
      </h3>
      <div className="grid grid-cols-7 xl:grid-cols-14 gap-2">
        {ORDERED_TACTICS.map((tactic) => {
          const tacticData = tacticMap.get(tactic);
          const count = tacticData?.count ?? 0;
          const techniques = tacticData?.techniques ?? [];
          const isHovered = hoveredTactic === tactic;

          return (
            <div
              key={tactic}
              className="relative"
              onMouseEnter={() => setHoveredTactic(tactic)}
              onMouseLeave={() => setHoveredTactic(null)}
            >
              <div
                className={`
                  ${getIntensityClass(count, maxCount)}
                  rounded-lg p-3 min-h-[90px]
                  flex flex-col items-center justify-center text-center
                  border border-border/50
                  transition-all duration-200
                  hover:border-cyan-500/50 hover:scale-105
                  cursor-default
                `}
              >
                <span
                  className={`text-[10px] leading-tight font-medium ${getTextClass(count, maxCount)}`}
                >
                  {tactic}
                </span>
                <span
                  className={`text-lg font-bold mt-1 ${getTextClass(count, maxCount)}`}
                >
                  {count}
                </span>
              </div>

              {isHovered && techniques.length > 0 && (
                <div
                  className="
                    absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2
                    bg-[#111118] border border-[#27272a] rounded-lg p-3
                    shadow-xl min-w-[200px] max-w-[280px]
                  "
                >
                  <p className="text-xs font-semibold text-cyan-400 mb-2">
                    {tactic} Techniques
                  </p>
                  <ul className="space-y-1">
                    {techniques.map((tech, i) => (
                      <li
                        key={i}
                        className="text-xs text-zinc-300 leading-snug"
                      >
                        {tech}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-end gap-2 mt-4">
        <span className="text-xs text-muted-foreground">Less</span>
        <div className="flex gap-1">
          {[10, 15, 25, 50, 65, 80, 100].map((opacity) => (
            <div
              key={opacity}
              className="w-4 h-4 rounded-sm border border-border/30"
              style={{ backgroundColor: `rgb(6 182 212 / ${opacity / 100})` }}
            />
          ))}
        </div>
        <span className="text-xs text-muted-foreground">More</span>
      </div>
    </div>
  );
}
