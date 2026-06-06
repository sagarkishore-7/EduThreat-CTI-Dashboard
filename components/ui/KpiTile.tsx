import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Sparkline } from "./Sparkline";
import { cn } from "@/lib/utils";

export type KpiAccent = "brand" | "threat" | "warn" | "pulse" | "info";

const ACCENT: Record<KpiAccent, string> = {
  brand: "#00d8b4",
  threat: "#ff4757",
  warn: "#ff8c42",
  pulse: "#818cf8",
  info: "#4dbcff",
};

interface KpiTileProps {
  label: string;
  value: string;
  icon: LucideIcon;
  accent?: KpiAccent;
  /** Sparkline series (oldest → newest) */
  trend?: number[];
  /** Period-over-period change, percent. Positive = up. */
  deltaPct?: number | null;
  /** Free-text caption shown next to the delta (e.g. "47 families"). */
  caption?: string;
  /** Treat an increase as bad (red) instead of good. KPIs like threats default to true. */
  invertDelta?: boolean;
  href?: string;
}

/**
 * Dashboard KPI tile: colored left border, icon, large mono value, a delta
 * indicator, and an inline sparkline showing the segment's recent trend.
 * Mirrors the Claude Design dashboard tiles.
 */
export function KpiTile({
  label,
  value,
  icon: Icon,
  accent = "brand",
  trend,
  deltaPct,
  caption,
  invertDelta = true,
  href,
}: KpiTileProps) {
  const color = ACCENT[accent];
  const hasDelta = deltaPct !== null && deltaPct !== undefined && !Number.isNaN(deltaPct);
  const up = hasDelta && (deltaPct as number) >= 0;
  // For "bad-when-rising" metrics, up = red (threat); else up = green (clear).
  const deltaColor = !hasDelta
    ? "#585f78"
    : (invertDelta ? up : !up)
      ? "#ff4757"
      : "#4ade80";

  const inner = (
    <div className="kpi-tile card-hover" style={{ ["--c" as string]: color }}>
      <div className="flex items-start justify-between">
        <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-500">{label}</span>
        <span className="kpi-icon">
          <Icon className="h-3.5 w-3.5" />
        </span>
      </div>
      <div className="kpi-val mt-2.5">{value}</div>
      <div className="mt-2.5 flex items-end justify-between gap-2">
        <span className="font-mono text-[10.5px] font-bold inline-flex items-center gap-1" style={{ color: deltaColor }}>
          {hasDelta ? (
            <>
              {up ? "▲" : "▼"} {Math.abs(deltaPct as number).toFixed(1)}%
            </>
          ) : (
            <span className="text-zinc-600">—</span>
          )}
          {caption && <span className="ml-0.5 font-normal text-zinc-500">{caption}</span>}
        </span>
        {trend && trend.length > 1 && (
          <Sparkline values={trend} color={color} width={84} height={26} />
        )}
      </div>
    </div>
  );

  return href ? (
    <Link href={href} className={cn("block transition-transform")}>
      {inner}
    </Link>
  ) : (
    inner
  );
}
