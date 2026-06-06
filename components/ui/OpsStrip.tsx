"use client";

import { useEffect, useState } from "react";
import { TlpBadge, type TlpLevel } from "./TlpBadge";

export interface OpsStat {
  value: string;
  label: string;
  tone?: "brand" | "alert" | "default";
}

const RANGES = ["1H", "24H", "7D", "30D", "90D", "YTD"] as const;

/**
 * The dashboard's live operations strip: a pulsing LIVE indicator, a row of
 * headline counters, a TLP marker, a time-range selector, and a live UTC clock.
 */
export function OpsStrip({
  stats,
  tlp = "amber",
  defaultRange = "7D",
  onRangeChange,
}: {
  stats: OpsStat[];
  tlp?: TlpLevel;
  defaultRange?: (typeof RANGES)[number];
  onRangeChange?: (range: string) => void;
}) {
  const [range, setRange] = useState<string>(defaultRange);
  const [now, setNow] = useState<string>("");

  useEffect(() => {
    const tick = () => {
      const d = new Date();
      const iso = d.toISOString().replace("T", " ").slice(0, 19);
      setNow(`${iso}Z`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex items-center gap-3 overflow-x-auto rounded-md border border-zinc-800/80 bg-[#10131c] px-3.5 py-2.5 text-[11.5px]">
      <span className="inline-flex items-center gap-1.5 shrink-0">
        <span className="dot dot-pulse" />
        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-emerald-300">LIVE</span>
      </span>
      {stats.map((s, i) => (
        <span key={s.label} className="inline-flex items-center gap-1.5 shrink-0">
          <span className="h-3.5 w-px bg-zinc-700/80" />
          <span
            className={
              "font-mono font-bold tabular-nums " +
              (s.tone === "brand" ? "text-emerald-300" : s.tone === "alert" ? "text-red-400" : "text-zinc-100")
            }
          >
            {s.value}
          </span>
          <span className="text-[10.5px] text-zinc-500">{s.label}</span>
        </span>
      ))}
      <span className="flex-1" />
      <TlpBadge level={tlp} className="shrink-0" />
      <div className="seg shrink-0">
        {RANGES.map((r) => (
          <button
            key={r}
            className={r === range ? "on" : ""}
            onClick={() => {
              setRange(r);
              onRangeChange?.(r);
            }}
          >
            {r}
          </button>
        ))}
      </div>
      <span className="shrink-0 font-mono text-[10.5px] text-zinc-500">{now}</span>
    </div>
  );
}
