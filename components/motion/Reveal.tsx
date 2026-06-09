"use client";

import { motion, useReducedMotion } from "framer-motion";
import { DUR, EASE_OUT } from "./Motion";

/**
 * Reveal-on-scroll: a subtle fade + 10px rise as the element enters the
 * viewport (once). Used to wrap page sections/cards so the page comes to life as
 * you scroll without anything flashy. Honours prefers-reduced-motion (renders
 * the final state immediately).
 */
export function Reveal({
  children,
  className,
  delay = 0,
  y = 10,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  y?: number;
}) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-12% 0px" }}
      transition={{ duration: DUR.base, ease: EASE_OUT, delay }}
    >
      {children}
    </motion.div>
  );
}
