"use client";

import { useId } from "react";

interface SparklineProps {
  values: number[];
  color?: string;
  width?: number;
  height?: number;
  strokeWidth?: number;
  /** Show a dot at the latest point */
  showDot?: boolean;
  fill?: boolean;
  className?: string;
}

/**
 * Compact area + line sparkline used inside KPI tiles to show the segment's
 * recent monthly trend (matches the Claude Design dashboard tiles).
 */
export function Sparkline({
  values,
  color = "#00d8b4",
  width = 80,
  height = 26,
  strokeWidth = 1.5,
  showDot = true,
  fill = true,
  className,
}: SparklineProps) {
  const gradId = useId().replace(/:/g, "");
  const series = values && values.length > 0 ? values : [0, 0];
  const max = Math.max(...series);
  const min = Math.min(...series);
  const range = max - min || 1;
  const pad = 2;

  const pts = series.map((v, i) => {
    const x = series.length === 1 ? width : (i / (series.length - 1)) * (width - pad * 2) + pad;
    const y = height - pad - ((v - min) / range) * (height - pad * 2);
    return [x, y] as const;
  });

  const linePath = pts
    .map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`)
    .join(" ");
  const areaPath = `${linePath} L${pts[pts.length - 1][0].toFixed(1)},${height} L${pts[0][0].toFixed(1)},${height} Z`;
  const last = pts[pts.length - 1];

  return (
    <svg
      className={className}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`spark-${gradId}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {fill && <path d={areaPath} fill={`url(#spark-${gradId})`} />}
      <path d={linePath} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round" strokeLinecap="round" />
      {showDot && <circle cx={last[0]} cy={last[1]} r={2} fill={color} />}
    </svg>
  );
}
