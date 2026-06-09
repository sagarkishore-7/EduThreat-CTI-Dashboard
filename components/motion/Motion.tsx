"use client";

import { animate, motion, useMotionValue, useReducedMotion, useTransform, type Variants } from "framer-motion";
import { useEffect, useRef, useState } from "react";

/* ── Shared motion tokens — one timing language across the app ── */
export const EASE_OUT = [0.22, 1, 0.36, 1] as const;
export const DUR = { fast: 0.3, base: 0.5, slow: 0.7 } as const;

/**
 * Staggered entrance container. Children wrapped in <MotionItem> reveal in
 * sequence on mount. Honours prefers-reduced-motion (renders instantly).
 */
export function MotionList({
  children,
  className,
  stagger = 0.05,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  stagger?: number;
  delay?: number;
}) {
  const reduce = useReducedMotion();
  const variants: Variants = {
    hidden: {},
    show: {
      transition: reduce ? {} : { staggerChildren: stagger, delayChildren: delay },
    },
  };
  return (
    <motion.div className={className} variants={variants} initial="hidden" animate="show">
      {children}
    </motion.div>
  );
}

const ITEM_VARIANTS: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.34, ease: [0.22, 1, 0.36, 1] } },
};

export function MotionItem({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div className={className} variants={reduce ? undefined : ITEM_VARIANTS}>
      {children}
    </motion.div>
  );
}

/**
 * Animate a number from 0 → target on mount. Returns the live value; pass a
 * formatter for display. Skips the animation under reduced-motion.
 */
export function useCountUp(target: number, durationMs = 900): number {
  const reduce = useReducedMotion();
  const [value, setValue] = useState(reduce ? target : 0);
  const startedRef = useRef(false);

  useEffect(() => {
    if (reduce) {
      setValue(target);
      return;
    }
    if (startedRef.current && value === target) return;
    startedRef.current = true;
    let raf = 0;
    const start = performance.now();
    const from = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(from + (target - from) * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, durationMs, reduce]);

  return value;
}

/**
 * Smooth count-up rendered through a framer-motion MotionValue, so the number
 * animates without re-rendering its parent every frame (the old `useCountUp`
 * setState-per-frame loop is what made the KPI numbers feel jittery). Tween +
 * ease-out over ~1.4s. Honours reduced-motion (shows the final value instantly).
 */
export function CountUp({
  value,
  format,
  durationMs = 1400,
  className,
}: {
  value: number;
  format: (n: number) => string;
  durationMs?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const mv = useMotionValue(reduce ? value : 0);
  const out = useTransform(mv, (v) => format(v));

  useEffect(() => {
    if (reduce) {
      mv.set(value);
      return;
    }
    const controls = animate(mv, value, { duration: durationMs / 1000, ease: EASE_OUT });
    return () => controls.stop();
  }, [value, durationMs, reduce, mv]);

  return <motion.span className={className}>{out}</motion.span>;
}

/** Fade/scale wrapper for charts so they draw in rather than pop. */
export function MotionReveal({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, scale: 0.985 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1], delay }}
    >
      {children}
    </motion.div>
  );
}
