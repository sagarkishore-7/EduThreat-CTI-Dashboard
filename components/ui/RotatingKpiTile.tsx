"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { KpiTile, type KpiTileProps } from "./KpiTile";
import { EASE_OUT, DUR } from "@/components/motion/Motion";

/**
 * A compact KPI tile that cycles through several KPI "faces" so more metrics fit
 * in the same slot. Correct carousel UX per research: auto-advances on an ~8s
 * timer that PAUSES on hover/focus, with clickable dot indicators to jump to a
 * face. Under prefers-reduced-motion it does not auto-advance (and swaps
 * instantly) — the dots remain so the user can flip manually.
 */
export function RotatingKpiTile({
  items,
  intervalMs = 8000,
}: {
  items: KpiTileProps[];
  intervalMs?: number;
}) {
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const n = items.length;

  useEffect(() => {
    if (reduce || paused || n <= 1) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % n), intervalMs);
    return () => clearInterval(id);
  }, [reduce, paused, n, intervalMs]);

  // Keep index valid if the items list changes length.
  const idxRef = useRef(index);
  idxRef.current = index;
  useEffect(() => {
    if (index >= n) setIndex(0);
  }, [n, index]);

  if (n === 0) return null;
  const active = items[Math.min(index, n - 1)];

  return (
    <div
      className="group relative h-full min-w-0"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      {reduce || n <= 1 ? (
        <KpiTile {...active} />
      ) : (
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={index}
            className="h-full"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: DUR.fast, ease: EASE_OUT }}
          >
            <KpiTile {...active} />
          </motion.div>
        </AnimatePresence>
      )}

      {n > 1 && (
        <div className="absolute bottom-1.5 right-2.5 z-10 flex items-center gap-1">
          {items.map((it, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Show ${it.label}`}
              aria-current={i === index}
              onClick={() => setIndex(i)}
              className={
                "h-1.5 rounded-full transition-all " +
                (i === index ? "w-3.5 bg-zinc-300" : "w-1.5 bg-zinc-600 hover:bg-zinc-400")
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
