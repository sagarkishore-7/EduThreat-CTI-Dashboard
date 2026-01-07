"use client";

import { cn, formatNumber } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  change?: number;
  changeLabel?: string;
  variant?: "default" | "primary" | "danger" | "warning" | "success";
}

const variantStyles = {
  default: {
    icon: "bg-secondary text-muted-foreground",
    glow: "",
  },
  primary: {
    icon: "bg-cyan-500/10 text-cyan-500",
    glow: "hover:shadow-[0_0_20px_rgba(6,182,212,0.2)]",
  },
  danger: {
    icon: "bg-red-500/10 text-red-500",
    glow: "hover:shadow-[0_0_20px_rgba(239,68,68,0.2)]",
  },
  warning: {
    icon: "bg-yellow-500/10 text-yellow-500",
    glow: "hover:shadow-[0_0_20px_rgba(234,179,8,0.2)]",
  },
  success: {
    icon: "bg-green-500/10 text-green-500",
    glow: "hover:shadow-[0_0_20px_rgba(34,197,94,0.2)]",
  },
};

export function StatCard({
  title,
  value,
  icon: Icon,
  change,
  changeLabel,
  variant = "default",
}: StatCardProps) {
  const styles = variantStyles[variant];
  const displayValue = typeof value === "number" ? formatNumber(value) : value;

  return (
    <div
      className={cn(
        "stat-card bg-card border border-border rounded-xl p-5 transition-all duration-300",
        "hover:border-primary/30",
        styles.glow
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground mb-1">{title}</p>
          <p className="text-3xl font-bold tracking-tight">{displayValue}</p>
          {change !== undefined && (
            <p
              className={cn(
                "text-xs mt-2 flex items-center gap-1",
                change >= 0 ? "text-green-500" : "text-red-500"
              )}
            >
              {change >= 0 ? "↑" : "↓"} {Math.abs(change)}%
              {changeLabel && (
                <span className="text-muted-foreground">{changeLabel}</span>
              )}
            </p>
          )}
        </div>
        <div className={cn("p-3 rounded-lg", styles.icon)}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}

