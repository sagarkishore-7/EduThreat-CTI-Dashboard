"use client";

import { useMemo } from "react";
import { EmptyState } from "@/components/EmptyState";

interface ActorInstitutionMatrixProps {
  data: {
    actors: string[];
    institution_types: string[];
    data: { actor: string; institution_type: string; count: number }[];
  };
}

function formatLabel(label: string): string {
  return label
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function getIntensityClass(count: number, maxCount: number): string {
  if (maxCount === 0 || count === 0) return "bg-cyan-500/5";
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
  if (maxCount === 0 || count === 0) return "text-muted-foreground/40";
  const ratio = count / maxCount;
  return ratio > 0.5 ? "text-white font-semibold" : "text-cyan-100";
}

export function ActorInstitutionMatrix({ data }: ActorInstitutionMatrixProps) {
  const { matrix, maxCount } = useMemo(() => {
    if (!data || !data.data || data.data.length === 0) {
      return { matrix: new Map<string, Map<string, number>>(), maxCount: 0 };
    }

    const m = new Map<string, Map<string, number>>();
    let max = 0;

    for (const point of data.data) {
      if (!m.has(point.actor)) {
        m.set(point.actor, new Map());
      }
      m.get(point.actor)!.set(point.institution_type, point.count);
      if (point.count > max) max = point.count;
    }

    return { matrix: m, maxCount: max };
  }, [data]);

  if (!data || !data.data || data.data.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="text-lg font-semibold mb-4">
          Threat Actor Institution Targeting
        </h3>
        <EmptyState message="No actor-institution data available" />
      </div>
    );
  }

  const actors = data.actors;
  const institutionTypes = data.institution_types;
  const colCount = institutionTypes.length + 1;

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <h3 className="text-lg font-semibold mb-4">
        Threat Actor Institution Targeting
      </h3>
      <div className="overflow-x-auto">
        <div
          className="grid gap-1 min-w-fit"
          style={{
            gridTemplateColumns: `160px repeat(${institutionTypes.length}, minmax(70px, 1fr))`,
          }}
        >
          {/* Header row */}
          <div className="sticky left-0 bg-card" />
          {institutionTypes.map((type) => (
            <div
              key={type}
              className="text-[10px] text-muted-foreground font-medium text-center px-1 pb-2 truncate"
              title={formatLabel(type)}
            >
              <span className="writing-mode-vertical inline-block max-w-full truncate">
                {formatLabel(type)}
              </span>
            </div>
          ))}

          {/* Data rows */}
          {actors.map((actor) => (
            <>
              <div
                key={`label-${actor}`}
                className="sticky left-0 bg-card text-xs text-zinc-300 font-medium flex items-center pr-2 truncate"
                title={formatLabel(actor)}
              >
                {formatLabel(actor)}
              </div>
              {institutionTypes.map((type) => {
                const count = matrix.get(actor)?.get(type) ?? 0;
                return (
                  <div
                    key={`${actor}-${type}`}
                    className={`
                      ${getIntensityClass(count, maxCount)}
                      rounded-md flex items-center justify-center
                      min-h-[36px] border border-border/30
                      transition-all duration-150 hover:scale-105 cursor-default
                    `}
                    title={`${formatLabel(actor)} → ${formatLabel(type)}: ${count}`}
                  >
                    <span className={`text-xs ${getTextClass(count, maxCount)}`}>
                      {count > 0 ? count : ""}
                    </span>
                  </div>
                );
              })}
            </>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-end gap-2 mt-4">
        <span className="text-xs text-muted-foreground">Less</span>
        <div className="flex gap-1">
          {[5, 15, 25, 50, 65, 80, 100].map((opacity) => (
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
