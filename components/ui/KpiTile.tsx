"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Sparkline } from "./Sparkline";
import { cn, formatNumber } from "@/lib/utils";
import { CountUp } from "@/components/motion/Motion";

/** Smoothly-animated value; falls back to the pre-formatted string. */
function KpiValue({ value, count, format }: { value: string; count?: number; format?: (n: number) => string }) {
  if (count === undefined) return <>{value}</>;
  return <CountUp value={count} format={format ?? ((n) => formatNumber(Math.round(n)))} />;
}

export type KpiAccent = "brand" | "threat" | "warn" | "pulse" | "info";

const ACCENT: Record<KpiAccent, string> = {
  brand: "#00d8b4",
  threat: "#ff4757",
  warn: "#ff8c42",
  pulse: "#818cf8",
  info: "#4dbcff",
};

export interface KpiTileProps {
  label: string;
  value: string;
  /** Optional raw number; when set the value animates (count-up) on mount. */
  count?: number;
  /** Custom formatter for the animated count value (e.g. percentages). */
  valueFormat?: (n: number) => string;
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
  count,
  valueFormat,
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
    <div className="kpi-tile card-hover h-full min-w-0" style={{ ["--c" as string]: color }}>
      <div className="flex items-start justify-between gap-2">
        <span className="min-w-0 truncate text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-500">{label}</span>
        <span className="kpi-icon shrink-0">
          <Icon className="h-3.5 w-3.5" />
        </span>
      </div>
      <div className="kpi-val mt-2.5 truncate"><KpiValue value={value} count={count} format={valueFormat} /></div>
      <div className="mt-2.5 flex items-end justify-between gap-2">
        <span className="inline-flex min-w-0 items-center gap-1 truncate font-mono text-[10.5px] font-bold" style={{ color: deltaColor }}>
          {hasDelta ? (
            <>
              {up ? "▲" : "▼"} {Math.abs(deltaPct as number).toFixed(1)}%
            </>
          ) : (
            <span className="text-zinc-600">—</span>
          )}
          {caption && <span className="ml-0.5 truncate font-normal text-zinc-500">{caption}</span>}
        </span>
        {/* Sparkline is fixed-width; hide it under ~420px so the 2-col KPI grid
            can't overflow a phone screen. */}
        {trend && trend.length > 1 && (
          <span className="hidden shrink-0 min-[420px]:block">
            <Sparkline values={trend} color={color} width={84} height={26} />
          </span>
        )}
      </div>
    </div>
  );

  return href ? (
    <Link href={href} className={cn("block h-full transition-transform")}>
      {inner}
    </Link>
  ) : (
    inner
  );
}
