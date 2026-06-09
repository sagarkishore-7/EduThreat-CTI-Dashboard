"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Gates a chart behind an IntersectionObserver and only mounts it once it scrolls
 * into view, so the chart's own left→right draw animation (recharts
 * isAnimationActive) plays exactly when the user reaches it — the "line draws as
 * you scroll to it" effect. Renders a fixed-height placeholder before reveal so
 * there is no layout shift. Reduced-motion users get the chart immediately.
 */
export function ChartReveal({
  children,
  minHeight = 0,
  className,
}: {
  children: React.ReactNode;
  /** Reserve height before the chart mounts to avoid layout shift. */
  minHeight?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    // SSR-safe + reduced-motion: show immediately if no IntersectionObserver or
    // the user prefers reduced motion.
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced || typeof IntersectionObserver === "undefined") {
      setShown(true);
      return;
    }
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.2, rootMargin: "-5% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className={className} style={minHeight ? { minHeight } : undefined}>
      {shown ? children : null}
    </div>
  );
}
